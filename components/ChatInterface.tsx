'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Mic, MicOff, Volume2, Send, Loader2, X, MessageSquare, Plus, Menu, Search, Download, Keyboard, Moon, Sun, User, LogOut } from 'lucide-react'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatHeader from '@/components/chat/ChatHeader'
import ChatMessageList from '@/components/chat/ChatMessageList'
import MessageActions from '@/components/chat/MessageActions'
import VoiceOverlay from '@/components/chat/VoiceOverlay'
import ChatInput from '@/components/chat/ChatInput'
import { Message, Chat } from '@/types'
import { APP_CONFIG, AUDIO_CONFIG, ERROR_MESSAGES, UI_CONFIG } from '@/lib/constants'
import {
  getAllChats,
  getChatMessages,
  saveChatMessages,
  createNewChat,
  deleteChat,
  getCurrentChatId,
  setCurrentChatId,
} from '@/lib/chat-management-supabase'
import { migrateOldChatFormat } from '@/lib/chat-management'
import {
  delay,
  formatTextForSpeech,
  formatTimestamp,
  isValidAudioBlob,
  getFileExtensionFromMimeType,
  getMicrophoneErrorMessage,
  sanitizeInput,
  sanitizeBotResponse,
  triggerHaptic,
} from '@/lib/utils'
import ConnectionStatus from '@/components/ConnectionStatus'
import SearchModal from '@/components/SearchModal'
import ExportChatModal from '@/components/ExportChatModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import SettingsModal from '@/components/SettingsModal'
import BottomNav from '@/components/BottomNav'
import { useTheme } from '@/lib/theme-context'
import { showToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'

/**
 * Get auth headers for API requests.
 * Retrieves the current Supabase session token and returns it as a Bearer token.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {}
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }
  } catch {
    console.warn('[Auth] Could not retrieve session token')
  }
  return {}
}

interface ChatInterfaceProps {
  user?: any
  onLoginClick?: () => void
  onLogout?: () => void
}

export default function ChatInterface({ user, onLoginClick, onLogout }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [isStreamingResponse, setIsStreamingResponse] = useState(false)
  const [showLoadingBubble, setShowLoadingBubble] = useState(false)
  const [isQueryingDatabase, setIsQueryingDatabase] = useState(false)
  const [isProcessingSTT, setIsProcessingSTT] = useState(false)
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [silenceStartTime, setSilenceStartTime] = useState<number | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeBottomTab, setActiveBottomTab] = useState<'chat' | 'history' | 'search' | 'settings'>('chat')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isPullRefreshing, setIsPullRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageIndex: number } | null>(null)
  const [swipingMessageIndex, setSwipingMessageIndex] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [pinnedMessages, setPinnedMessages] = useState<Set<number>>(new Set())
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set())
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [swipingChatId, setSwipingChatId] = useState<string | null>(null)
  const [chatSwipeOffset, setChatSwipeOffset] = useState(0)
  const [showSmartReplies, setShowSmartReplies] = useState(true)
  const [reactionPicker, setReactionPicker] = useState<{ messageIndex: number; x: number; y: number } | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const { theme, toggleTheme } = useTheme()
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamTimeoutRef = useRef<number | null>(null)
  const loadingBubbleTimeoutRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const silenceStartTimeRef = useRef<number | null>(null)
  const voiceOnlyModeRef = useRef<boolean>(false) // Use ref to track voice-only mode reliably
  const pullStartY = useRef<number>(0)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const swipeHapticTriggered = useRef<boolean>(false)
  const chatTouchStartX = useRef<number>(0)
  const chatTouchStartY = useRef<number>(0)
  const streamingDisabled = useMemo(
    () =>
      process.env.NEXT_PUBLIC_DISABLE_STREAMING === 'true' ||
      process.env.CHAT_STREAMING_DISABLED === 'true',
    []
  )

  // Initialize chats on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    async function loadChats() {
      setIsLoadingChats(true)
      try {
        // Migrate old format if needed (localStorage only)
        migrateOldChatFormat()

        // Load chat list (Supabase if authenticated, localStorage otherwise)
        const loadedChats = await getAllChats()

        // Enhance chats with last message preview
        const enhancedChats = await Promise.all(
          loadedChats.map(async (chat) => {
            const messages = await getChatMessages(chat.id)
            const lastMessage = messages.length > 0
              ? messages[messages.length - 1].content.substring(0, 60) + (messages[messages.length - 1].content.length > 60 ? '...' : '')
              : ''
            return { ...chat, lastMessage }
          })
        )

        setChats(enhancedChats)

        // Load current chat
        const currentId = getCurrentChatId()
        if (currentId) {
          const chatExists = loadedChats.some(c => c.id === currentId)
          if (chatExists) {
            setCurrentChatId(currentId)
            const chatMessages = await getChatMessages(currentId)
            setMessages(chatMessages)
          } else {
            // Current chat doesn't exist, create new one
            const newChat = await createNewChat()
            setCurrentChatId(newChat.id)
            setChats([newChat, ...loadedChats])
            setMessages([])
          }
        } else if (loadedChats.length > 0) {
          // No current chat, use first one
          const firstChat = loadedChats[0]
          setCurrentChatId(firstChat.id)
          const chatMessages = await getChatMessages(firstChat.id)
          setMessages(chatMessages)
        } else {
          // No chats exist, create new one
          const newChat = await createNewChat()
          setCurrentChatId(newChat.id)
          setChats([newChat])
          setMessages([])
        }
      } finally {
        setIsLoadingChats(false)
      }
    }

    loadChats()
  }, [])

  // Save chat messages with debounce to prevent duplicate saves during streaming
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedMessagesRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined' || !currentChatId) return

    // Don't save during streaming - wait for completion
    if (isStreamingResponse) return

    // Create a hash of current messages to prevent duplicate saves
    const messagesHash = JSON.stringify(messages.map(m => ({ role: m.role, content: m.content })))
    if (messagesHash === lastSavedMessagesRef.current) return

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce save by 500ms to batch rapid changes
    saveTimeoutRef.current = setTimeout(async () => {
      if (messages.length > 0 && currentChatId) {
        lastSavedMessagesRef.current = messagesHash
        await saveChatMessages(currentChatId, messages)
        // Update chat list to reflect changes
        const updatedChats = await getAllChats()
        setChats(updatedChats)
      }
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, currentChatId, isStreamingResponse])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle scroll position tracking for scroll-to-bottom button
  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollButton(distanceFromBottom > 150)
  }, [])

  // Auto-expand textarea as user types (up to 5 lines)
  const autoExpandTextarea = useCallback(() => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    textarea.style.height = 'auto'

    // Calculate new height (max 5 lines)
    const lineHeight = 24 // approximate line height
    const maxLines = 5
    const maxHeight = lineHeight * maxLines
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)

    textarea.style.height = `${newHeight}px`
  }, [])

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput(prev => prev + emoji)
    triggerHaptic('light')
    // Focus back on textarea after selecting emoji
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Scroll to bottom function with haptic feedback
  const scrollToBottom = useCallback(() => {
    triggerHaptic('light')
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Handle quick action from empty state
  const handleQuickAction = useCallback((text: string) => {
    triggerHaptic('medium')
    setInput(text)
    setTimeout(() => {
      textareaRef.current?.focus()
      // Trigger send automatically
      const event = new KeyboardEvent('keypress', { key: 'Enter' })
      textareaRef.current?.dispatchEvent(event)
    }, 100)
  }, [])

  // Toggle chat pin
  const toggleChatPin = useCallback((chatId: string) => {
    setPinnedChats(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chatId)) {
        newSet.delete(chatId)
        showToast('Chat nicht mehr angepinnt', 'success', 2000)
      } else {
        newSet.add(chatId)
        showToast('Chat angepinnt', 'success', 2000)
      }
      return newSet
    })
    triggerHaptic('light')
  }, [])

  // Get chat icon based on content/title
  const getChatIcon = useCallback((chat: Chat): string => {
    const title = chat.title.toLowerCase()
    if (title.includes('projekt')) return '📋'
    if (title.includes('mitarbeiter') || title.includes('team')) return '👥'
    if (title.includes('termin') || title.includes('kalender')) return '📅'
    if (title.includes('aufgabe') || title.includes('task')) return '✅'
    if (title.includes('bericht') || title.includes('report')) return '📊'
    return '💬'
  }, [])

  // Filter and sort chats
  const filteredAndSortedChats = useMemo(() => {
    let filtered = chats

    // Apply search filter
    if (chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase()
      filtered = chats.filter(chat =>
        chat.title.toLowerCase().includes(query) ||
        chat.lastMessage?.toLowerCase().includes(query)
      )
    }

    // Sort: pinned first, then by updatedAt
    return filtered.sort((a, b) => {
      const aPin = pinnedChats.has(a.id)
      const bPin = pinnedChats.has(b.id)

      if (aPin && !bPin) return -1
      if (!aPin && bPin) return 1

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [chats, chatSearchQuery, pinnedChats])

  // Chat swipe handlers
  const handleChatTouchStart = useCallback((e: React.TouchEvent, chatId: string) => {
    chatTouchStartX.current = e.touches[0].clientX
    chatTouchStartY.current = e.touches[0].clientY
  }, [])

  const handleChatTouchMove = useCallback((e: React.TouchEvent, chatId: string) => {
    const deltaX = e.touches[0].clientX - chatTouchStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - chatTouchStartY.current)

    // Only swipe horizontally
    if (deltaY < 30 && Math.abs(deltaX) > 10) {
      setSwipingChatId(chatId)
      // Only allow left swipe (negative deltaX)
      setChatSwipeOffset(Math.max(-100, Math.min(0, deltaX)))
    }
  }, [])

  const handleChatTouchEnd = useCallback((chatId: string) => {
    if (swipingChatId === chatId && chatSwipeOffset < -60) {
      // Trigger delete
      triggerHaptic('medium')
      handleDeleteChat(chatId)
    }

    setSwipingChatId(null)
    setChatSwipeOffset(0)
  }, [swipingChatId, chatSwipeOffset])

  // Generate smart reply suggestions based on last bot message
  const smartReplySuggestions = useMemo(() => {
    if (messages.length === 0 || !showSmartReplies) return []

    const lastBotMessage = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastBotMessage) return []

    const content = lastBotMessage.content.toLowerCase()
    const suggestions: string[] = []

    // Question detection
    if (content.includes('?')) {
      if (content.includes('möchtest') || content.includes('willst') || content.includes('soll ich')) {
        suggestions.push('Ja, bitte', 'Nein, danke')
      } else if (content.includes('weitere') || content.includes('mehr')) {
        suggestions.push('Ja, mehr Details', 'Nein, das reicht')
      } else {
        suggestions.push('Ja', 'Nein', 'Mehr Informationen')
      }
    }

    // List/Options detection
    if (content.includes('wählen') || content.includes('auswählen') || content.includes('option')) {
      suggestions.push('Option 1', 'Option 2', 'Zeige alle')
    }

    // Data query response
    if (content.includes('projekt') || content.includes('mitarbeiter') || content.includes('termin')) {
      if (!suggestions.length) {
        suggestions.push('Mehr Details', 'Nächster', 'Danke')
      }
    }

    // Success/completion messages
    if (content.includes('fertig') || content.includes('erledigt') || content.includes('gespeichert')) {
      suggestions.push('Danke', 'Weiter', 'Neuer Chat')
    }

    // Error/problem messages
    if (content.includes('fehler') || content.includes('problem') || content.includes('nicht gefunden')) {
      suggestions.push('Nochmal versuchen', 'Anders formulieren', 'Hilfe')
    }

    // Default contextual suggestions
    if (suggestions.length === 0) {
      suggestions.push('Verstanden', 'Mehr Details', 'Danke')
    }

    // Return max 3 suggestions
    return suggestions.slice(0, 3)
  }, [messages, showSmartReplies])

  // Handle smart reply selection
  const handleSmartReplyClick = useCallback((reply: string) => {
    triggerHaptic('light')
    setInput(reply)
    setShowSmartReplies(false)
    // Auto-focus the textarea
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Reset smart replies when new assistant message arrives
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && !showSmartReplies) {
        setShowSmartReplies(true)
      }
    }
  }, [messages])

  // Add reaction to message
  const handleAddReaction = useCallback((messageIndex: number, emoji: string) => {
    triggerHaptic('light')
    setMessages(prev => {
      const newMessages = [...prev]
      const message = newMessages[messageIndex]

      if (!message.reactions) {
        message.reactions = {}
      }

      message.reactions[emoji] = (message.reactions[emoji] || 0) + 1

      return newMessages
    })
    setReactionPicker(null)
    showToast('Reaktion hinzugefügt', 'success', 1500)
  }, [])

  // Show reaction picker on double-tap
  const handleMessageDoubleTap = useCallback((e: React.TouchEvent, index: number) => {
    e.preventDefault()
    const touch = e.touches[0] || e.changedTouches[0]
    setReactionPicker({
      messageIndex: index,
      x: touch.clientX,
      y: touch.clientY
    })
    triggerHaptic('medium')
  }, [])

  // Close reaction picker
  useEffect(() => {
    const handleClickOutside = () => setReactionPicker(null)
    if (reactionPicker) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [reactionPicker])



  // Pull-to-refresh handlers
  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (messagesContainerRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }, [])

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current === 0 || messagesContainerRef.current?.scrollTop !== 0) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - pullStartY.current)

    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 80))
    }
  }, [])

  const handlePullEnd = useCallback(async () => {
    if (pullDistance > 60) {
      setIsPullRefreshing(true)
      triggerHaptic('medium')

      // Refresh chat data
      if (currentChatId) {
        const chatMessages = await getChatMessages(currentChatId)
        setMessages(chatMessages)
      }

      setTimeout(() => {
        setIsPullRefreshing(false)
        setPullDistance(0)
        pullStartY.current = 0
      }, 1000)
    } else {
      setPullDistance(0)
      pullStartY.current = 0
    }
  }, [pullDistance, currentChatId])

  // Long press handler for context menu
  const handleMessageTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY

    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium')
      setContextMenu({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        messageIndex: index
      })
    }, 500)
  }, [])

  const handleMessageTouchMove = useCallback((e: React.TouchEvent, index: number) => {
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

    // Cancel long press if finger moved too much
    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    // Handle swipe (only horizontal movement, minimal vertical)
    if (deltaY < 30 && Math.abs(deltaX) > 20) {
      setSwipingMessageIndex(index)
      const newOffset = Math.max(-80, Math.min(80, deltaX))
      setSwipeOffset(newOffset)

      // Trigger haptic at action threshold (50px)
      if (!swipeHapticTriggered.current && Math.abs(newOffset) >= 50) {
        triggerHaptic('light')
        swipeHapticTriggered.current = true
      }
    }
  }, [])

  const handleMessageTouchEnd = useCallback((index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Handle swipe action completion
    if (swipingMessageIndex === index) {
      if (swipeOffset > 50) {
        // Swipe right - copy
        triggerHaptic('light')
        copyToClipboard(messages[index].content, index)
        showToast('Nachricht kopiert', 'success', 2000)
      } else if (swipeOffset < -50) {
        // Swipe left - delete (only for user messages)
        if (messages[index].role === 'user') {
          triggerHaptic('medium')
          const newMessages = messages.filter((_, i) => i !== index)
          setMessages(newMessages)
          showToast('Nachricht gelöscht', 'success', 2000)
        }
      }

      setSwipingMessageIndex(null)
      setSwipeOffset(0)
      swipeHapticTriggered.current = false
    }
  }, [swipingMessageIndex, swipeOffset, messages])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [contextMenu])

  // Context menu helper callbacks for MessageActions
  const handleContextMenuCopy = useCallback((text: string, index: number) => {
    copyToClipboard(text, index)
  }, [])

  const handleContextMenuDelete = useCallback((index: number) => {
    const newMessages = messages.filter((_, i) => i !== index)
    setMessages(newMessages)
  }, [messages])

  const handleContextMenuRegenerate = useCallback((index: number) => {
    if (index > 0) {
      const userMessageIndex = index - 1
      const userMessage = messages[userMessageIndex]
      if (userMessage && userMessage.role === 'user') {
        const newMessages = messages.slice(0, userMessageIndex + 1)
        setMessages(newMessages)
        startChatRequest(userMessage)
      }
    }
  }, [messages])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const startRecording = async () => {
    if (isRecording) return

    try {
      // Check if we're in the browser (not SSR)
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        showToast('Diese Funktion benötigt eine Browser-Umgebung. Bitte lade die Seite neu.', 'error', 5000)
        return
      }

      // Check for getUserMedia support with fallbacks
      // Safari on macOS might need special handling
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

      // Check what's actually available
      const hasMediaDevices = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
      const hasMediaDevicesGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
      const hasWebkitGetUserMedia = typeof (navigator as any).webkitGetUserMedia === 'function'
      const hasNavigatorGetUserMedia = typeof (navigator as any).getUserMedia === 'function'
      const hasMozGetUserMedia = typeof (navigator as any).mozGetUserMedia === 'function'

      // If mediaDevices is undefined, try to polyfill it for Safari
      if (!hasMediaDevices && hasWebkitGetUserMedia) {
        // Safari might need a polyfill - try to create mediaDevices
        try {
          (navigator as any).mediaDevices = (navigator as any).mediaDevices || {}
          if (!(navigator as any).mediaDevices.getUserMedia && hasWebkitGetUserMedia) {
            (navigator as any).mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) => {
              return new Promise<MediaStream>((resolve, reject) => {
                (navigator as any).webkitGetUserMedia(
                  constraints,
                  resolve,
                  reject
                )
              })
            }
            // Update the check
            const hasPolyfilled = typeof (navigator as any).mediaDevices.getUserMedia === 'function'
            if (hasPolyfilled) {
              console.log('Polyfilled navigator.mediaDevices.getUserMedia for Safari')
            }
          }
        } catch (e) {
          console.error('Failed to polyfill mediaDevices:', e)
        }
      }

      // Re-check after potential polyfill
      const hasMediaDevicesAfterPolyfill = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
      const hasMediaDevicesGetUserMediaAfterPolyfill = hasMediaDevicesAfterPolyfill && typeof navigator.mediaDevices.getUserMedia === 'function'

      if (!hasMediaDevicesGetUserMediaAfterPolyfill && !hasWebkitGetUserMedia && !hasNavigatorGetUserMedia && !hasMozGetUserMedia) {
        const userAgent = navigator.userAgent
        const isIOS = /iPad|iPhone|iPod/.test(userAgent)
        const isAndroid = /Android/.test(userAgent)
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
        const isSecure = protocol === 'https:' || isLocalhost

        // Detailed debugging
        const debugInfo = {
          hasMediaDevices: !!navigator.mediaDevices,
          hasMediaDevicesGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          hasNavigatorGetUserMedia: !!(navigator as any).getUserMedia,
          hasWebkitGetUserMedia: !!(navigator as any).webkitGetUserMedia,
          hasMozGetUserMedia: !!(navigator as any).mozGetUserMedia,
          protocol,
          hostname,
          isLocalhost,
          isSecure,
          userAgent,
          navigatorKeys: Object.keys(navigator).filter(key => key.toLowerCase().includes('media') || key.toLowerCase().includes('user')),
        }
        console.error('getUserMedia not available:', debugInfo)
        console.error('Full navigator.mediaDevices:', navigator.mediaDevices)
        console.error('navigator.mediaDevices type:', typeof navigator.mediaDevices)

        let errorMsg = 'Dein Browser erlaubt aktuell keinen Mikrofonzugriff.\n\n'

        // Only warn about HTTPS if it's not localhost
        if (!isSecure && !isLocalhost && protocol === 'http:') {
          errorMsg += '⚠️ Wichtig: Mikrofonzugriff funktioniert nur über HTTPS oder auf localhost.\n'
          errorMsg += `Aktuell: ${protocol}//${hostname}\n\n`
        }

        if (isIOS) {
          errorMsg += 'Für iOS gilt:\n- Verwende Safari (ab iOS 11)\n- Nutze HTTPS oder localhost\n- Prüfe in Safari unter Einstellungen → Websites → Mikrofon'
        } else if (isAndroid) {
          errorMsg += 'Für Android gilt: Verwende Chrome oder Firefox und erlaube den Mikrofonzugriff.'
        } else {
          errorMsg += 'Bitte nutze einen modernen Browser wie Chrome, Firefox oder Safari.\n\n'
          errorMsg += 'Falls du Safari verwendest:\n- Stelle sicher, dass du Safari 11+ nutzt\n- Aktiviere die Mikrofonberechtigung in den Safari-Einstellungen'
        }
        errorMsg += `\n\nBrowser: ${userAgent}\nProtokoll: ${protocol}\nHostname: ${hostname}`
        showToast(errorMsg, 'error', 6000)
        return
      }

      // Check if MediaRecorder is available
      if (!window.MediaRecorder) {
        const userAgent = navigator.userAgent
        showToast(`Der MediaRecorder wird von deinem Browser nicht unterstützt. Nutze bitte Chrome, Firefox oder Safari (iOS 14.3+). Aktueller Browser: ${userAgent}`, 'error', 8000)
        return
      }

      // Request microphone access
      // Use the standard API directly - it should work in Safari 11+
      let stream: MediaStream

      // Re-check after potential polyfill
      const finalHasMediaDevices = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
      const finalHasMediaDevicesGetUserMedia = finalHasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'

      if (finalHasMediaDevicesGetUserMedia) {
        // Modern standard API (Chrome, Firefox, Safari 11+)
        stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONFIG.RECORDING_OPTIONS
        })
      } else if (hasWebkitGetUserMedia) {
        // Safari fallback (older Safari)
        stream = await new Promise<MediaStream>((resolve, reject) => {
          (navigator as any).webkitGetUserMedia(
            { audio: true },
            resolve,
            reject
          )
        })
      } else if (hasNavigatorGetUserMedia) {
        // Other fallback
        stream = await new Promise<MediaStream>((resolve, reject) => {
          (navigator as any).getUserMedia(
            { audio: true },
            resolve,
            reject
          )
        })
      } else if (hasMozGetUserMedia) {
        // Firefox fallback
        stream = await new Promise<MediaStream>((resolve, reject) => {
          (navigator as any).mozGetUserMedia(
            { audio: true },
            resolve,
            reject
          )
        })
      } else {
        throw new Error('getUserMedia is not available')
      }

      // Detect mobile device
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      // Try to find a supported MIME type (prioritize formats that work on mobile)
      let mimeType = ''
      for (const type of AUDIO_CONFIG.SUPPORTED_MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }

      // For iOS/Safari, use browser default if no specific type is supported
      if (!mimeType && (isIOS || isSafari)) {
        mimeType = '' // Let browser choose
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      audioChunksRef.current = []

      // Start audio monitoring for voice-only mode
      if (voiceOnlyModeRef.current) {
        startAudioMonitoring(stream)
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error)
        setIsRecording(false)
        stream.getTracks().forEach((track) => track.stop())
        showToast('Bei der Aufnahme ist ein Fehler aufgetreten. Bitte versuch es erneut.', 'error', 4000)
      }

      mediaRecorder.onstop = async () => {
        // Stop audio monitoring
        stopAudioMonitoring()
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        console.log('[STT] MediaRecorder stopped, chunks collected:', audioChunksRef.current.length)

        if (audioChunksRef.current.length === 0) {
          console.warn('[STT] No audio chunks recorded')
          setIsRecording(false)
          if (!voiceOnlyModeRef.current) {
            showToast('Es wurde kein Audio aufgezeichnet. Bitte versuch es erneut.', 'warning', 4000)
          }
          // In voice-only mode, restart recording if no audio was captured
          if (voiceOnlyModeRef.current) {
            setTimeout(() => {
              if (voiceOnlyModeRef.current && !isRecording) {
                startRecording()
              }
            }, 500)
          }
          return
        }

        // Create audio blob and send to STT API
        const actualMimeType = mediaRecorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        })

        console.log('[STT] Audio blob created:', {
          size: audioBlob.size,
          type: actualMimeType,
          chunks: audioChunksRef.current.length
        })

        // Check if blob is too small (likely no actual audio)
        if (!isValidAudioBlob(audioBlob)) {
          console.warn('[STT] Audio blob too small, likely no audio captured')
          setIsRecording(false)
          if (!voiceOnlyModeRef.current) {
            showToast('Die Aufnahme war zu kurz. Bitte versuch es erneut.', 'warning', 4000)
          }
          if (voiceOnlyModeRef.current) {
            setTimeout(() => {
              if (voiceOnlyModeRef.current && !isRecording) {
                startRecording()
              }
            }, 500)
          }
          return
        }

        // Determine file extension based on MIME type
        const fileExtension = getFileExtensionFromMimeType(actualMimeType)

        try {
          setIsProcessingVoice(true)
          setIsProcessingSTT(true)
          const formData = new FormData()
          formData.append('audio', audioBlob, `recording.${fileExtension}`)

          let sttResponse: Response | null = null
          let sttError: Error | null = null

          for (let attempt = 0; attempt < APP_CONFIG.STT_MAX_ATTEMPTS; attempt++) {
            try {
              const authHeaders = await getAuthHeaders()
              const candidate = await fetch('/api/stt', {
                method: 'POST',
                headers: {
                  ...authHeaders,
                },
                body: formData,
              })

              if (candidate.ok) {
                sttResponse = candidate
                break
              } else {
                const errorData = await candidate.json().catch(() => ({}))
                sttError = new Error(errorData.error || `STT-Fehler (${candidate.status})`)
              }
            } catch (err) {
              sttError = err instanceof Error ? err : new Error('Unbekannter STT-Fehler')
            }

            if (attempt < APP_CONFIG.STT_MAX_ATTEMPTS - 1) {
              await delay(APP_CONFIG.STT_RETRY_DELAY_MS)
            }
          }

          if (!sttResponse) {
            throw (sttError || new Error('Die Spracherkennung ist fehlgeschlagen.'))
          }

          const data = await sttResponse.json()
          if (data.transcript) {
            // In voice-only mode, automatically send the message and get response
            if (voiceOnlyModeRef.current) {
              await handleVoiceOnlyMessage(data.transcript)
            } else {
              // Normal mode: just set the input
              setInput(data.transcript)
            }
          } else {
            if (!voiceOnlyModeRef.current) {
              showToast('Es wurde keine Sprache erkannt. Bitte sprich noch einmal.', 'warning', 4000)
            }
            // In voice-only mode, restart recording
            if (voiceOnlyModeRef.current) {
              setTimeout(() => {
                if (voiceOnlyModeRef.current && !isRecording) {
                  startRecording()
                }
              }, 500)
            }
          }
        } catch (error) {
          console.error('STT error:', error)
          console.error('Audio blob size:', audioBlob.size, 'Type:', actualMimeType)

          let errorMsg = 'Die Spracherkennung ist fehlgeschlagen. '
          if (error instanceof Error) {
            errorMsg += error.message
          } else {
            errorMsg += 'Unbekannter Fehler'
          }

          // Provide helpful mobile-specific error messages
          if (isMobile) {
            errorMsg += '\n\nAuf mobilen Geräten gilt:\n- Stelle eine stabile Internetverbindung sicher\n- Die Aufnahme sollte klar und nicht zu kurz sein\n- Sprich lauter oder näher am Mikrofon'
          }

          showToast(errorMsg, 'error', 6000)

          // In voice-only mode, restart recording after error
          if (voiceOnlyModeRef.current) {
            setTimeout(() => {
              if (voiceOnlyModeRef.current && !isRecording) {
                startRecording()
              }
            }, 1000)
          }
        } finally {
          setIsRecording(false)
          setIsProcessingVoice(false)
          setIsProcessingSTT(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder

      // Always use timeslices to ensure data is captured reliably
      // This prevents the "first recording fails" issue where ondataavailable
      // doesn't fire if recording is stopped too quickly
      console.log(`[STT] Starting MediaRecorder with ${APP_CONFIG.AUDIO_CHUNK_SIZE_MS}ms timeslices`)
      mediaRecorder.start(APP_CONFIG.AUDIO_CHUNK_SIZE_MS)

      // Haptic feedback on recording start
      triggerHaptic('heavy')
      setIsRecording(true)
    } catch (error: any) {
      console.error('Error accessing microphone:', error)
      setIsRecording(false)

      const errorMessage = error instanceof Error
        ? getMicrophoneErrorMessage(error)
        : ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED

      showToast(errorMessage, 'error', 6000)
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Haptic feedback on recording stop
      triggerHaptic('medium')
      mediaRecorderRef.current.stop()
      // setIsRecording will be set to false in onstop handler
    }
  }, [isRecording])


  const speakText = useCallback(async (text: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlayingAudio(false)
    }

    // Cancel any ongoing speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    let audioUrl: string | null = null
    let fallbackTimeout: number | null = null

    // Detect iOS
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

    const speakWithWebSpeech = (fallbackText: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        throw new Error('Web Speech API not available')
      }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(fallbackText)
      utterance.lang = 'de-DE'
      utterance.rate = APP_CONFIG.TTS_SLOW_RATE
      utterance.pitch = 1
      utterance.volume = 1

      setIsPlayingAudio(true)
      setIsGeneratingTTS(false)

      utterance.onend = () => {
        setIsPlayingAudio(false)
        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
          setTimeout(() => {
            if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
              startRecording()
            }
          }, 500)
        }
      }

      utterance.onerror = (e) => {
        console.error('[TTS] Web Speech error:', e)
        setIsPlayingAudio(false)
      }

      window.speechSynthesis.speak(utterance)
    }

    try {
      setIsGeneratingTTS(true)
      const preparedText = formatTextForSpeech(text)

      // On iOS, prefer Web Speech API as it's more reliable
      if (isIOS) {
        console.log('[TTS] iOS detected, using Web Speech API directly')
        speakWithWebSpeech(preparedText)
        return
      }
      const ttsStartTime = Date.now()

      console.log('[TTS] Starting TTS for text length:', preparedText.length)

      let ttsResponse: Response | null = null
      let ttsError: Error | null = null

      for (let attempt = 0; attempt < APP_CONFIG.TTS_MAX_ATTEMPTS; attempt++) {
        try {
          const authHeaders = await getAuthHeaders()
          const candidate = await fetch('/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            body: JSON.stringify({ text: preparedText }),
          })

          if (candidate.ok) {
            ttsResponse = candidate
            break
          } else {
            const errorText = await candidate.text().catch(() => 'Unbekannter Fehler')
            ttsError = new Error(`TTS-Fehler (${candidate.status}): ${errorText}`)
          }
        } catch (err) {
          ttsError = err instanceof Error ? err : new Error('Unbekannter TTS-Fehler')
        }

        if (attempt < APP_CONFIG.TTS_MAX_ATTEMPTS - 1) {
          await delay(APP_CONFIG.TTS_RETRY_DELAY_MS)
        }
      }

      if (!ttsResponse) {
        setIsGeneratingTTS(false)
        throw (ttsError || new Error('Die Audioausgabe konnte nicht erzeugt werden.'))
      }

      // Convert response to blob URL
      const audioBlob = await ttsResponse.blob()
      audioUrl = URL.createObjectURL(audioBlob)

      console.log('[TTS] Audio blob received, size:', audioBlob.size)

      // Create audio element immediately and start loading
      const audio = new Audio()
      audioRef.current = audio

      // Store URL for cleanup
      const urlToCleanup = audioUrl

      // Set state BEFORE setting up handlers to ensure button is visible immediately
      setIsPlayingAudio(true)
      setIsGeneratingTTS(false) // TTS generation is complete, now playing

      // Set up event handlers before setting source
      audio.onplay = () => {
        console.log('[TTS] Audio onplay event fired')
        if (fallbackTimeout) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }
        const playbackDelayMs = Date.now() - ttsStartTime
        if (playbackDelayMs > APP_CONFIG.TTS_FALLBACK_DELAY_MS) {
          audio.playbackRate = APP_CONFIG.TTS_SLOW_RATE
        }
        setIsPlayingAudio(true) // Ensure it's still true
      }

      audio.onended = () => {
        console.log('[TTS] Audio onended event fired')
        setIsPlayingAudio(false)
        audioRef.current = null
        if (urlToCleanup) {
          URL.revokeObjectURL(urlToCleanup)
        }
        if (fallbackTimeout) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }

        // In voice-only mode, restart recording after audio finishes
        // Use ref to get current state reliably
        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
          console.log('[TTS] Restarting recording after audio ended')
          setTimeout(() => {
            if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
              startRecording()
            }
          }, 500)
        }
      }

      audio.onerror = (e) => {
        console.error('Audio playback error:', e, {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src
        })
        setIsPlayingAudio(false)
        setIsGeneratingTTS(false)
        audioRef.current = null
        if (urlToCleanup) {
          URL.revokeObjectURL(urlToCleanup)
        }
        if (fallbackTimeout) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }
        // Don't show alert in voice-only mode to avoid interrupting flow
        if (!voiceOnlyMode) {
          showToast('Audio konnte nicht abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
        }
      }

      // Set source and preload
      audio.src = audioUrl
      audio.preload = 'auto'
      // Ensure consistent playback speed (1.0 = normal speed)
      audio.playbackRate = 1.0

      console.log('[TTS] Audio element created, attempting to play...', {
        readyState: audio.readyState,
        src: audioUrl.substring(0, 50) + '...'
      })

      // Simplified playback logic - just try to play, with one retry on failure
      let playAttempted = false

      const attemptPlay = async () => {
        if (playAttempted) {
          console.log('[TTS] Play already attempted, skipping duplicate')
          return
        }
        playAttempted = true

        console.log('[TTS] Attempting to play audio...', { readyState: audio.readyState })

        try {
          await audio.play()
          console.log('[TTS] Audio playing successfully')
        } catch (playError: any) {
          console.error('[TTS] Play error:', playError)

          // Handle play errors gracefully
          if (playError.name === 'NotAllowedError') {
            console.error('[TTS] Audio play blocked by browser autoplay policy')
            setIsPlayingAudio(false)
            audioRef.current = null
            if (urlToCleanup) {
              URL.revokeObjectURL(urlToCleanup)
            }
            if (fallbackTimeout) {
              window.clearTimeout(fallbackTimeout)
              fallbackTimeout = null
            }
            try {
              speakWithWebSpeech(preparedText)
            } catch (fallbackError) {
              console.error('[TTS] Web Speech fallback failed:', fallbackError)
            }
            setIsGeneratingTTS(false)
            if (!voiceOnlyMode) {
              showToast('Die Audiowiedergabe wurde vom Browser blockiert. Bitte interagiere zuerst mit der Seite (z.B. ein Klick).', 'warning', 5000)
            }
          } else {
            // For other errors, wait a bit and try once more
            console.log('[TTS] Retrying playback after brief delay...')
            setTimeout(async () => {
              try {
                await audio.play()
                console.log('[TTS] Audio playing successfully after retry')
              } catch (retryError) {
                console.error('[TTS] Audio play retry failed:', retryError)
                setIsPlayingAudio(false)
                audioRef.current = null
                if (urlToCleanup) {
                  URL.revokeObjectURL(urlToCleanup)
                }
                if (!voiceOnlyMode) {
                  showToast('Audio konnte nicht abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
                }
              }
            }, 200)
          }
        }
      }

      // Try to play as soon as enough data is loaded
      if (audio.readyState >= 3) {
        // HAVE_FUTURE_DATA or higher - enough to start playing
        attemptPlay()
      } else {
        // Wait for canplay event (HAVE_FUTURE_DATA)
        audio.addEventListener('canplay', attemptPlay, { once: true })
      }

      fallbackTimeout = window.setTimeout(() => {
        console.warn('[TTS] Playback delay exceeded, falling back to Web Speech API')
        try {
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            audioRef.current = null
          }
          if (urlToCleanup) {
            URL.revokeObjectURL(urlToCleanup)
          }
          speakWithWebSpeech(preparedText)
        } catch (fallbackError) {
          console.error('[TTS] Web Speech fallback failed:', fallbackError)
        }
      }, APP_CONFIG.TTS_FALLBACK_DELAY_MS)
    } catch (error) {
      console.error('TTS error:', error)
      setIsPlayingAudio(false)
      setIsGeneratingTTS(false)
      if (fallbackTimeout) {
        window.clearTimeout(fallbackTimeout)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (audioRef.current) {
        audioRef.current = null
      }
      try {
        speakWithWebSpeech(formatTextForSpeech(text))
      } catch (fallbackError) {
        console.error('[TTS] Web Speech fallback failed:', fallbackError)
      }
      // Don't show alert in voice-only mode
      if (!voiceOnlyMode) {
        showToast('Audio konnte nicht erzeugt oder abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isLoading, voiceOnlyMode]) // startRecording is stable, no need to include

  const stopSpeaking = useCallback(() => {
    console.log('[TTS] Stop speaking requested', {
      hasAudio: !!audioRef.current,
      isPlayingAudio,
      voiceOnlyMode: voiceOnlyModeRef.current
    })

    // Always clean up audio, even if ref is null
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0 // Reset to start
      } catch (e) {
        console.warn('[TTS] Error pausing audio:', e)
      }
      audioRef.current = null
    }

    // Always set state to false, even if audio was already gone
    setIsPlayingAudio(false)

    // In voice-only mode, restart recording after interrupting
    if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
      console.log('[TTS] Restarting recording after interrupt')
      setTimeout(() => {
        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
          startRecording()
        }
      }, 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isLoading, isPlayingAudio]) // startRecording is stable, no need to include

  const exitVoiceOnlyMode = useCallback(() => {
    console.log('[Voice Mode] Exiting voice-only mode')
    setVoiceOnlyMode(false)
    voiceOnlyModeRef.current = false // Sync ref immediately - this stops the loop
    stopRecording()
    stopSpeaking()
    stopAudioMonitoring()
  }, [stopRecording, stopSpeaking])

  // Voice Activity Detection - monitor audio levels
  const startAudioMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 2048 // Larger FFT for better time domain analysis
      analyser.smoothingTimeConstant = 0.3 // Less smoothing for more responsive detection
      microphone.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      streamRef.current = stream
      silenceStartTimeRef.current = null // Reset silence timer

      const dataArray = new Uint8Array(analyser.fftSize)
      const silenceDuration = APP_CONFIG.SILENCE_DURATION_MS

      // Dynamic threshold: measure background noise first
      let backgroundNoiseLevel = 0
      let samplesCollected = 0
      const calibrationSamples = APP_CONFIG.VAD_CALIBRATION_SAMPLES
      let hasDetectedSpeech = false // Track if we've detected any speech

      const monitorAudio = () => {
        if (!analyserRef.current || !voiceOnlyModeRef.current || !isRecording) {
          return
        }

        // Use getByteTimeDomainData for amplitude-based VAD (better for speech detection)
        analyserRef.current.getByteTimeDomainData(dataArray)

        // Calculate RMS (Root Mean Square) for better amplitude detection
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128 // Normalize to -1 to 1
          sum += normalized * normalized
        }
        const rms = Math.sqrt(sum / dataArray.length)
        const amplitude = Math.abs(rms) * 100 // Convert to 0-100 scale

        // Normalize for visualization (0-1)
        const normalizedLevel = Math.min(amplitude / 50, 1)
        setAudioLevel(normalizedLevel)

        // Calibrate background noise level during first few samples
        if (samplesCollected < calibrationSamples) {
          backgroundNoiseLevel = (backgroundNoiseLevel * samplesCollected + amplitude) / (samplesCollected + 1)
          samplesCollected++
        } else {
          // After calibration, use dynamic threshold (background noise + margin)
          const dynamicThreshold = Math.max(
            backgroundNoiseLevel * APP_CONFIG.VAD_THRESHOLD_MULTIPLIER,
            5
          ) // At least 5, or threshold multiplier x background

          // Debug logging (can be removed later)
          if (samplesCollected === calibrationSamples + 1) {
            console.log('VAD calibrated:', { backgroundNoiseLevel, dynamicThreshold })
          }

          // Detect if speech is present (amplitude significantly above background)
          if (amplitude > dynamicThreshold) {
            hasDetectedSpeech = true
            // Reset silence timer if audio detected
            if (silenceStartTimeRef.current !== null) {
              silenceStartTimeRef.current = null
              setSilenceStartTime(null)
            }
          } else if (hasDetectedSpeech) {
            // Only start silence timer if we've detected speech before
            // This prevents auto-stop before user even speaks
            if (silenceStartTimeRef.current === null) {
              silenceStartTimeRef.current = Date.now()
              setSilenceStartTime(silenceStartTimeRef.current)
            } else {
              const silenceDurationMs = Date.now() - silenceStartTimeRef.current
              if (silenceDurationMs >= silenceDuration) {
                // Auto-stop after silence
                console.log('Auto-stopping recording due to silence', {
                  amplitude,
                  threshold: dynamicThreshold,
                  backgroundNoise: backgroundNoiseLevel,
                  silenceDuration: silenceDurationMs
                })
                stopRecording()
                silenceStartTimeRef.current = null
                setSilenceStartTime(null)
                return // Exit monitoring
              }
            }
          }
        }

        // Continue monitoring
        if (voiceOnlyModeRef.current && isRecording) {
          animationFrameRef.current = requestAnimationFrame(monitorAudio)
        }
      }

      monitorAudio()
    } catch (error) {
      console.error('Error starting audio monitoring:', error)
    }
  }

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    silenceStartTimeRef.current = null
    setAudioLevel(0)
    setSilenceStartTime(null)
  }

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), UI_CONFIG.COPY_FEEDBACK_DURATION_MS)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  const handleSetCopiedIndex = useCallback((index: number | null) => {
    setCopiedIndex(index)
  }, [])

  const clearChat = useCallback(async () => {
    if (confirm('Möchtest du den gesamten Chatverlauf wirklich löschen?')) {
      setMessages([])
      if (currentChatId) {
        await saveChatMessages(currentChatId, [])
        const updatedChats = await getAllChats()
        setChats(updatedChats)
      }
      showToast('Chatverlauf wurde gelöscht', 'success', 3000)
    }
  }, [currentChatId])

  // Chat management functions
  const handleNewChat = async () => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      await saveChatMessages(currentChatId, messages)
    }

    const newChat = await createNewChat()
    setCurrentChatId(newChat.id)
    const updatedChats = await getAllChats()
    setChats(updatedChats)
    setMessages([])
    setShowChatSidebar(false)
  }

  const handleSwitchChat = async (chatId: string) => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      await saveChatMessages(currentChatId, messages)
    }

    setCurrentChatId(chatId)
    const chatMessages = await getChatMessages(chatId)
    setMessages(chatMessages)
    const updatedChats = await getAllChats()
    setChats(updatedChats)
    setShowChatSidebar(false)
  }

  const handleDeleteChat = async (chatId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (window.confirm('Möchtest du diesen Chat wirklich löschen?')) {
      await deleteChat(chatId)
      const updatedChats = await getAllChats()
      setChats(updatedChats)

      // If deleted chat was current, switch to another
      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          await handleSwitchChat(updatedChats[0].id)
        } else {
          await handleNewChat()
        }
      }
    }
  }

  const clearStreamTimeout = () => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current)
      streamTimeoutRef.current = null
    }
  }

  const clearLoadingBubbleTimeout = () => {
    if (loadingBubbleTimeoutRef.current) {
      clearTimeout(loadingBubbleTimeoutRef.current)
      loadingBubbleTimeoutRef.current = null
    }
  }

  const cancelStreaming = (message?: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    clearStreamTimeout()
    clearLoadingBubbleTimeout()
    setShowLoadingBubble(false)

    if (message) {
      const timestamp = new Date()
      // Sanitize message to remove JSON
      const sanitizedMessage = sanitizeBotResponse(message)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: sanitizedMessage,
          timestamp,
        },
      ])
    }
  }

  const readSseStream = useCallback(async (
    response: Response,
    assistantIndex: number,
    { speakResponse }: { speakResponse?: boolean } = {}
  ) => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Streaming wird nicht unterstützt.')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const assistantTimestamp = new Date()
    let assembledContent = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        if (!event.trim()) continue
        const dataLine = event
          .split('\n')
          .find((line) => line.startsWith('data:'))
        if (!dataLine) continue

        try {
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''))
          if (payload.type === 'token' && payload.content) {
            setIsStreamingResponse(true)
            setShowLoadingBubble(false)
            assembledContent += payload.content
            // Sanitize content to remove JSON as it streams in
            // Use functional update to get current state
            setMessages((prev) => {
              const currentContent = prev[assistantIndex]?.content || ''
              const newContent = currentContent + payload.content
              const sanitizedContent = sanitizeBotResponse(newContent)
              return prev.map((msg, idx) =>
                idx === assistantIndex
                  ? { ...msg, content: sanitizedContent, timestamp: assistantTimestamp }
                  : msg
              )
            })
          } else if (payload.type === 'tool_calls' && payload.tool_calls) {
            // Preserve tool calls in the message
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === assistantIndex
                  ? { ...msg, tool_calls: payload.tool_calls, timestamp: assistantTimestamp }
                  : msg
              )
            )
          } else if (payload.type === 'tool_response' && payload.tool_call_id) {
            // Tool response messages are for the AI only, not for display
            // Don't add them to the messages array - they're internal
            // The AI will use them to generate the final response
          } else if (payload.type === 'done') {
            if (speakResponse) {
              speakText(assembledContent).catch((error) => {
                console.error('TTS error in streaming:', error)
              })
            }
            return
          } else if (payload.type === 'error') {
            throw new Error(payload.message || 'Streaming-Fehler')
          }
        } catch (err) {
          console.error('SSE parsing error:', err)
        }
      }
    }
  }, [speakText]) // speakText is now memoized with useCallback

  const startChatRequest = useCallback(async (
    userMessage: Message,
    { speakResponse }: { speakResponse?: boolean } = {}
  ) => {
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setIsQueryingDatabase(true)
    setIsStreamingResponse(false)
    setShowLoadingBubble(false)

    clearLoadingBubbleTimeout()
    loadingBubbleTimeoutRef.current = window.setTimeout(() => {
      setShowLoadingBubble(true)
    }, APP_CONFIG.LOADING_BUBBLE_DELAY_MS)

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timeoutId = window.setTimeout(() => {
      controller.abort()
    }, APP_CONFIG.STREAM_TIMEOUT_MS)
    streamTimeoutRef.current = timeoutId

    const conversationMessages = [...messages, userMessage]
      .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
      .map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls && { tool_calls: m.tool_calls }),
        ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
      }))

    const assistantTimestamp = new Date()
    let assistantIndex = -1

    setMessages((prev) => {
      assistantIndex = prev.length
      return [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: assistantTimestamp,
        },
      ]
    })

    try {
      const authHeaders = await getAuthHeaders()
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(streamingDisabled ? { 'X-Disable-Streaming': 'true' } : {}),
        },
        body: JSON.stringify({
          messages: conversationMessages,
          chatId: currentChatId || undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Antwort konnte nicht geladen werden.'
        showToast(errorMessage, 'error', 5000)
        throw new Error(errorMessage)
      }

      const contentType = response.headers.get('content-type') || ''
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/aa46043d-1848-493a-a3a4-c47b42dc91a7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatInterface.tsx:response-received', message: 'Chat response received', data: { status: response.status, contentType, streaming: !streamingDisabled && contentType.includes('text/event-stream') }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => { });
      // #endregion

      if (!streamingDisabled && contentType.includes('text/event-stream')) {
        await readSseStream(response, assistantIndex, { speakResponse })
      } else {
        const data = await response.json()
        // Sanitize non-streaming response to remove JSON
        const sanitizedContent = sanitizeBotResponse(data.message?.content || 'Antwort konnte nicht geladen werden.')
        setMessages((prev) =>
          prev.map((msg, idx) =>
            idx === assistantIndex
              ? {
                ...msg,
                content: sanitizedContent,
                timestamp: assistantTimestamp,
              }
              : msg
          )
        )

        if (speakResponse) {
          speakText(data.message?.content || '').catch((error) => {
            console.error('TTS error in fallback:', error)
          })
        }
        setShowLoadingBubble(false)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/aa46043d-1848-493a-a3a4-c47b42dc91a7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatInterface.tsx:startChatRequest-error', message: 'Chat request error', data: { error: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H5' }) }).catch(() => { });
      // #endregion
      setShowLoadingBubble(false)
      setIsQueryingDatabase(false)
      const isAbort = error instanceof DOMException && error.name === 'AbortError'

      if (!isAbort) {
        const errorMessage = error instanceof Error ? error.message : 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuch es noch einmal.'
        showToast(errorMessage, 'error', 5000)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: isAbort
          ? 'Die Anfrage wurde abgebrochen.'
          : 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuch es noch einmal.',
        timestamp: new Date(),
      }
      setMessages((prev) =>
        prev.map((msg, idx) => (idx === assistantIndex ? assistantMessage : msg))
      )
    } finally {
      clearStreamTimeout()
      clearLoadingBubbleTimeout()
      abortControllerRef.current = null
      setShowLoadingBubble(false)
      setIsStreamingResponse(false)
      setIsLoading(false)
      setIsQueryingDatabase(false)
    }
  }, [messages, currentChatId, streamingDisabled, readSseStream, clearLoadingBubbleTimeout, clearStreamTimeout, speakText])

  const sendMessage = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/aa46043d-1848-493a-a3a4-c47b42dc91a7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatInterface.tsx:sendMessage', message: 'sendMessage called', data: { inputLength: input?.length, isLoading }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => { });
    // #endregion
    const sanitizedInput = sanitizeInput(input)
    if (!sanitizedInput || isLoading) return

    // Haptic feedback on message send
    triggerHaptic('medium')

    const userMessage: Message = {
      role: 'user',
      content: sanitizedInput,
      timestamp: new Date(),
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/aa46043d-1848-493a-a3a4-c47b42dc91a7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChatInterface.tsx:sendMessage-prepared', message: 'User message prepared', data: { content: sanitizedInput.substring(0, 50) }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => { });
    // #endregion

    setInput('')
    await startChatRequest(userMessage)
  }, [input, isLoading, startChatRequest])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus input field
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        textareaRef.current?.focus()
      }

      // Esc: Cancel recording or exit voice-only mode
      if (e.key === 'Escape') {
        if (isRecording) {
          stopRecording()
          showToast('Aufnahme abgebrochen', 'info', 2000)
        }
        if (voiceOnlyMode) {
          exitVoiceOnlyMode()
        }
        // Cancel ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }

      // Ctrl/Cmd + Enter: Send message (alternative to Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isLoading && input.trim()) {
          sendMessage()
        }
      }

      // Ctrl/Cmd + F: Open search modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearchModal(true)
      }

      // Ctrl/Cmd + E: Open export modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportModal(true)
      }

      // Ctrl/Cmd + /: Open keyboard shortcuts modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcutsModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [isRecording, voiceOnlyMode, isLoading, input, sendMessage, exitVoiceOnlyMode, stopRecording])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        UI_CONFIG.TEXTAREA_MAX_HEIGHT
      )}px`
    }
  }, [input])

  const handleVoiceOnlyMessage = async (transcript: string) => {
    const userMessage: Message = {
      role: 'user',
      content: transcript,
      timestamp: new Date(),
    }

    await startChatRequest(userMessage, { speakResponse: true })
  }

  // Unlock audio for iOS - must be called from user gesture
  const unlockAudioForIOS = () => {
    // Create and play a silent audio to unlock audio playback on iOS
    const silentAudio = new Audio()
    silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onr2+wL29vb29ubi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4t7e3t7e3t7e3t7e3'
    silentAudio.volume = 0.01
    silentAudio.play().then(() => {
      silentAudio.pause()
      console.log('[iOS Audio] Audio unlocked successfully')
    }).catch(() => {
      console.log('[iOS Audio] Silent audio unlock failed, will try with real audio')
    })

    // Also resume AudioContext if it exists
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('[iOS Audio] AudioContext resumed')
      }).catch(() => {
        console.log('[iOS Audio] AudioContext resume failed')
      })
    }
  }

  const enterVoiceOnlyMode = async () => {
    console.log('[Voice Mode] Entering voice-only mode')

    // Unlock audio on iOS (must be done from user gesture)
    unlockAudioForIOS()

    setVoiceOnlyMode(true)
    voiceOnlyModeRef.current = true // Sync ref immediately
    // Start recording immediately
    await startRecording()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioMonitoring()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const playLastResponse = () => {
    // Unlock audio on iOS (called from button click = user gesture)
    unlockAudioForIOS()

    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant')

    if (lastAssistantMessage) {
      speakText(lastAssistantMessage.content)
    }
  }

  return (
    <div className="flex flex-col h-screen-safe bg-white dark:bg-slate-900 safe-area-inset relative pb-16 sm:pb-0">
      {/* Chat Sidebar */}
      <ChatSidebar
        showChatSidebar={showChatSidebar}
        chats={filteredAndSortedChats}
        currentChatId={currentChatId}
        isLoadingChats={isLoadingChats}
        chatSearchQuery={chatSearchQuery}
        setChatSearchQuery={setChatSearchQuery}
        pinnedChats={pinnedChats}
        swipingChatId={swipingChatId}
        chatSwipeOffset={chatSwipeOffset}
        handleNewChat={handleNewChat}
        handleSwitchChat={handleSwitchChat}
        handleDeleteChat={handleDeleteChat}
        toggleChatPin={toggleChatPin}
        handleChatTouchStart={handleChatTouchStart}
        handleChatTouchMove={handleChatTouchMove}
        handleChatTouchEnd={handleChatTouchEnd}
        getChatIcon={getChatIcon}
        setShowChatSidebar={setShowChatSidebar}
        setActiveBottomTab={setActiveBottomTab}
      />

      {/* Header */}
      <ChatHeader
        voiceOnlyMode={voiceOnlyMode}
        isLoading={isLoading}
        theme={theme}
        toggleTheme={toggleTheme}
        showChatSidebar={showChatSidebar}
        setShowChatSidebar={setShowChatSidebar}
        setShowSearchModal={setShowSearchModal}
        setShowExportModal={setShowExportModal}
        setShowShortcutsModal={setShowShortcutsModal}
        exitVoiceOnlyMode={exitVoiceOnlyMode}
        clearChat={clearChat}
        messages={messages}
        user={user}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
      />

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        isLoadingHistory={isLoadingHistory}
        showLoadingBubble={showLoadingBubble}
        isStreamingResponse={isStreamingResponse}
        copiedIndex={copiedIndex}
        setCopiedIndex={handleSetCopiedIndex}
        pinnedMessages={pinnedMessages}
        swipingMessageIndex={swipingMessageIndex}
        swipeOffset={swipeOffset}
        pullDistance={pullDistance}
        isPullRefreshing={isPullRefreshing}
        showScrollButton={showScrollButton}
        voiceOnlyMode={voiceOnlyMode}
        reactionPicker={reactionPicker}
        setReactionPicker={setReactionPicker}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        onScrollChange={handleMessagesScroll}
        onPullStart={handlePullStart}
        onPullMove={handlePullMove}
        onPullEnd={handlePullEnd}
        onMessageTouchStart={handleMessageTouchStart}
        onMessageTouchMove={handleMessageTouchMove}
        onMessageTouchEnd={handleMessageTouchEnd}
        onQuickAction={handleQuickAction}
        onScrollToBottom={scrollToBottom}
        onAddReaction={handleAddReaction}
      />

      {/* Input Area */}
      {voiceOnlyMode ? (
        <VoiceOverlay
          isRecording={isRecording}
          isProcessingVoice={isProcessingVoice}
          isLoading={isLoading}
          isPlayingAudio={isPlayingAudio}
          audioLevel={audioLevel}
          silenceStartTime={silenceStartTime}
          startRecording={startRecording}
          stopRecording={stopRecording}
          stopSpeaking={stopSpeaking}
          exitVoiceOnlyMode={exitVoiceOnlyMode}
        />
      ) : (
        <ChatInput
          input={input}
          setInput={setInput}
          isRecording={isRecording}
          isLoading={isLoading}
          isPlayingAudio={isPlayingAudio}
          voiceOnlyMode={voiceOnlyMode}
          messages={messages}
          smartReplySuggestions={smartReplySuggestions}
          textareaRef={textareaRef}
          autoExpandTextarea={autoExpandTextarea}
          handleKeyPress={handleKeyPress}
          sendMessage={sendMessage}
          startRecording={startRecording}
          stopRecording={stopRecording}
          enterVoiceOnlyMode={enterVoiceOnlyMode}
          stopSpeaking={stopSpeaking}
          playLastResponse={playLastResponse}
          cancelStreaming={cancelStreaming}
          handleSmartReplyClick={handleSmartReplyClick}
          handleEmojiSelect={handleEmojiSelect}
          setShowSmartReplies={setShowSmartReplies}
        />
      )}

      {/* Modals */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => {
          setShowSearchModal(false)
          setActiveBottomTab('chat')
        }}
        messages={messages}
        onSelectMessage={(index) => {
          setShowSearchModal(false)
          setActiveBottomTab('chat')
          const element = document.querySelector(`[data-message-index="${index}"]`)
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }}
      />
      <ExportChatModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false)
          setActiveBottomTab('chat')
        }}
        messages={messages}
      />
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => {
          setShowShortcutsModal(false)
          setActiveBottomTab('chat')
        }}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false)
          setActiveBottomTab('chat')
        }}
        onExportClick={() => {
          setShowSettingsModal(false)
          setShowExportModal(true)
        }}
        onShortcutsClick={() => {
          setShowSettingsModal(false)
          setShowShortcutsModal(true)
        }}
        onClearChat={() => {
          setShowSettingsModal(false)
          clearChat()
        }}
        user={user}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
      />

      {/* Bottom Navigation (Mobile only) */}
      <BottomNav
        activeTab={activeBottomTab}
        onNewChat={() => {
          setActiveBottomTab('chat')
          clearChat()
        }}
        onHistoryClick={() => {
          setActiveBottomTab('history')
          setShowChatSidebar(true)
        }}
        onSearchClick={() => {
          setActiveBottomTab('search')
          setShowSearchModal(true)
        }}
        onSettingsClick={() => {
          setActiveBottomTab('settings')
          setShowSettingsModal(true)
        }}
      />

      {/* Context Menu & Reaction Picker */}
      <MessageActions
        messages={messages}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        pinnedMessages={pinnedMessages}
        setPinnedMessages={setPinnedMessages}
        reactionPicker={reactionPicker}
        setReactionPicker={setReactionPicker}
        onCopy={handleContextMenuCopy}
        onDelete={handleContextMenuDelete}
        onRegenerate={handleContextMenuRegenerate}
        onAddReaction={handleAddReaction}
      />
    </div>
  )
}
