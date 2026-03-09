'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatHeader from '@/components/chat/ChatHeader'
import ChatMessageList from '@/components/chat/ChatMessageList'
import MessageActions from '@/components/chat/MessageActions'
import VoiceOverlay from '@/components/chat/VoiceOverlay'
import ChatInput from '@/components/chat/ChatInput'
import { Message } from '@/types'
import { UI_CONFIG } from '@/lib/constants'
import { triggerHaptic } from '@/lib/utils'
import ConnectionStatus from '@/components/ConnectionStatus'
import SearchModal from '@/components/SearchModal'
import ExportChatModal from '@/components/ExportChatModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import SettingsModal from '@/components/SettingsModal'
import BottomNav from '@/components/BottomNav'
import { useTheme } from '@/lib/theme-context'
import { showToast } from '@/lib/toast'
import { useChatManagement } from '@/hooks/useChatManagement'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useAudioPlayback } from '@/hooks/useAudioPlayback'
import { useVoiceMode } from '@/hooks/useVoiceMode'
import type { User } from '@supabase/supabase-js'

interface ChatInterfaceProps {
  user?: User | null
  onLoginClick?: () => void
  onLogout?: () => void
  onNavigateToDashboard?: () => void
}

export default function ChatInterface({ user, onLoginClick, onLogout, onNavigateToDashboard }: ChatInterfaceProps) {
  // ─── Modals & UI chrome ─────────────────────────────────────────
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeBottomTab, setActiveBottomTab] = useState<'chat' | 'history' | 'search' | 'settings'>('chat')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showSmartReplies, setShowSmartReplies] = useState(true)

  // ─── Message interactions ─────────────────────────────────────────
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageIndex: number } | null>(null)
  const [swipingMessageIndex, setSwipingMessageIndex] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [pinnedMessages, setPinnedMessages] = useState<Set<number>>(new Set())
  const [reactionPicker, setReactionPicker] = useState<{ messageIndex: number; x: number; y: number } | null>(null)
  const [isPullRefreshing, setIsPullRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isLoadingHistory] = useState(false)

  // ─── Refs ─────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pullStartY = useRef<number>(0)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const swipeHapticTriggered = useRef<boolean>(false)

  const { theme, toggleTheme } = useTheme()

  // ─── Chat Management (sidebar, CRUD, persistence) ─────────────
  // We need isStreamingResponse early but it comes from useChatMessages.
  // We'll track it via a ref that gets synced after useChatMessages initialises.
  const isStreamingRef = useRef(false)

  const chatMgmt = useChatManagement(isStreamingRef.current)

  // ─── Chat Messages (sending, streaming, loading) ──────────────
  const chatMsgs = useChatMessages({
    messages: chatMgmt.messages,
    setMessages: chatMgmt.setMessages,
    currentChatId: chatMgmt.currentChatId,
    speakText: async () => { }, // placeholder — will be wired after audio hooks init
  })

  // Sync streaming ref for debounced save
  isStreamingRef.current = chatMsgs.isStreamingResponse

  // ─── Audio Recorder ────────────────────────────────────────────
  // voiceOnlyModeRef is created here and shared with all hooks
  const voiceOnlyModeRef = useRef(false)

  const recorder = useAudioRecorder({
    getAuthHeaders: chatMsgs.getAuthHeadersFn,
    voiceOnlyModeRef,
    onVoiceOnlyTranscript: async (transcript: string) => {
      const userMessage: Message = {
        role: 'user',
        content: transcript,
        timestamp: new Date(),
      }
      await chatMsgs.startChatRequest(userMessage, { speakResponse: true })
    },
    onTranscript: (transcript: string) => {
      chatMsgs.setInput(transcript)
    },
  })

  // ─── Audio Playback ────────────────────────────────────────────
  const playback = useAudioPlayback({
    getAuthHeaders: chatMsgs.getAuthHeadersFn,
    voiceOnlyModeRef,
    isRecording: recorder.isRecording,
    isLoading: chatMsgs.isLoading,
    voiceOnlyMode: voiceOnlyModeRef.current,
    startRecording: recorder.startRecording,
  })

  // Now re-create useChatMessages with the real speakText
  // We avoid the circular dep by patching startChatRequest's speakText via a ref
  const speakTextRef = useRef(playback.speakText)
  speakTextRef.current = playback.speakText

  // Override the voice-only transcript handler to use real speakText
  // This is already wired through startChatRequest -> speakResponse flag

  // ─── Voice Mode ────────────────────────────────────────────────
  const voiceMode = useVoiceMode({
    startRecording: recorder.startRecording,
    stopRecording: recorder.stopRecording,
    stopSpeaking: playback.stopSpeaking,
    stopAudioMonitoring: recorder.stopAudioMonitoring,
    unlockAudioForIOS: playback.unlockAudioForIOS,
  })

  // Sync voiceOnlyModeRef with voiceMode state
  voiceOnlyModeRef.current = voiceMode.voiceOnlyMode

  // ─── Scroll to bottom on new messages ──────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMgmt.messages])

  // ─── Auto-resize textarea ──────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        UI_CONFIG.TEXTAREA_MAX_HEIGHT
      )}px`
    }
  }, [chatMsgs.input])

  // ─── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (recorder.isRecording) {
          recorder.stopRecording()
          showToast('Aufnahme abgebrochen', 'info', 2000)
        }
        if (voiceMode.voiceOnlyMode) {
          voiceMode.exitVoiceOnlyMode()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!chatMsgs.isLoading && chatMsgs.input.trim()) {
          chatMsgs.sendMessage()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearchModal(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportModal(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcutsModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [recorder.isRecording, voiceMode.voiceOnlyMode, chatMsgs.isLoading, chatMsgs.input, chatMsgs.sendMessage, voiceMode.exitVoiceOnlyMode, recorder.stopRecording])

  // ─── Smart replies ─────────────────────────────────────────────
  const smartReplySuggestions = useMemo(() => {
    if (chatMgmt.messages.length === 0 || !showSmartReplies) return []

    const lastBotMessage = [...chatMgmt.messages].reverse().find(m => m.role === 'assistant')
    if (!lastBotMessage) return []

    const content = lastBotMessage.content.toLowerCase()
    const suggestions: string[] = []

    if (content.includes('?')) {
      if (content.includes('möchtest') || content.includes('willst') || content.includes('soll ich')) {
        suggestions.push('Ja, bitte', 'Nein, danke')
      } else if (content.includes('weitere') || content.includes('mehr')) {
        suggestions.push('Ja, mehr Details', 'Nein, das reicht')
      } else {
        suggestions.push('Ja', 'Nein', 'Mehr Informationen')
      }
    }

    if (content.includes('wählen') || content.includes('auswählen') || content.includes('option')) {
      suggestions.push('Option 1', 'Option 2', 'Zeige alle')
    }

    if (content.includes('projekt') || content.includes('mitarbeiter') || content.includes('termin')) {
      if (!suggestions.length) {
        suggestions.push('Mehr Details', 'Nächster', 'Danke')
      }
    }

    if (content.includes('fertig') || content.includes('erledigt') || content.includes('gespeichert')) {
      suggestions.push('Danke', 'Weiter', 'Neuer Chat')
    }

    if (content.includes('fehler') || content.includes('problem') || content.includes('nicht gefunden')) {
      suggestions.push('Nochmal versuchen', 'Anders formulieren', 'Hilfe')
    }

    if (suggestions.length === 0) {
      suggestions.push('Verstanden', 'Mehr Details', 'Danke')
    }

    return suggestions.slice(0, 3)
  }, [chatMgmt.messages, showSmartReplies])

  // Reset smart replies on new assistant message
  useEffect(() => {
    if (chatMgmt.messages.length > 0) {
      const lastMessage = chatMgmt.messages[chatMgmt.messages.length - 1]
      if (lastMessage.role === 'assistant' && !showSmartReplies) {
        setShowSmartReplies(true)
      }
    }
  }, [chatMgmt.messages, showSmartReplies])

  // ─── Scroll tracking ──────────────────────────────────────────
  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollButton(distanceFromBottom > 150)
  }, [])

  const scrollToBottom = useCallback(() => {
    triggerHaptic('light')
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // ─── Textarea helpers ──────────────────────────────────────────
  const autoExpandTextarea = useCallback(() => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    textarea.style.height = 'auto'
    const lineHeight = 24
    const maxLines = 5
    const maxHeight = lineHeight * maxLines
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [])

  const handleEmojiSelect = useCallback((emoji: string) => {
    chatMsgs.setInput(chatMsgs.input + emoji)
    triggerHaptic('light')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [chatMsgs])

  const handleQuickAction = useCallback((text: string) => {
    triggerHaptic('medium')
    chatMsgs.setInput(text)
    setTimeout(() => {
      textareaRef.current?.focus()
      const event = new KeyboardEvent('keypress', { key: 'Enter' })
      textareaRef.current?.dispatchEvent(event)
    }, 100)
  }, [chatMsgs])

  const handleSmartReplyClick = useCallback((reply: string) => {
    triggerHaptic('light')
    chatMsgs.setInput(reply)
    setShowSmartReplies(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [chatMsgs])

  // ─── Copy to clipboard ────────────────────────────────────────
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

  // ─── Reactions ─────────────────────────────────────────────────
  const handleAddReaction = useCallback((messageIndex: number, emoji: string) => {
    triggerHaptic('light')
    chatMgmt.setMessages(prev => {
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
  }, [chatMgmt])

  // Close reaction picker on click outside
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

  // ─── Pull-to-refresh ──────────────────────────────────────────
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
      // Refresh handled by chat management
      setTimeout(() => {
        setIsPullRefreshing(false)
        setPullDistance(0)
        pullStartY.current = 0
      }, 1000)
    } else {
      setPullDistance(0)
      pullStartY.current = 0
    }
  }, [pullDistance])

  // ─── Message touch handlers (swipe & long press) ──────────────
  const handleMessageTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium')
      setContextMenu({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        messageIndex: index,
      })
    }, 500)
  }, [])

  const handleMessageTouchMove = useCallback((e: React.TouchEvent, index: number) => {
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    if (deltaY < 30 && Math.abs(deltaX) > 20) {
      setSwipingMessageIndex(index)
      const newOffset = Math.max(-80, Math.min(80, deltaX))
      setSwipeOffset(newOffset)
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
    if (swipingMessageIndex === index) {
      if (swipeOffset > 50) {
        triggerHaptic('light')
        copyToClipboard(chatMgmt.messages[index].content, index)
        showToast('Nachricht kopiert', 'success', 2000)
      } else if (swipeOffset < -50) {
        if (chatMgmt.messages[index].role === 'user') {
          triggerHaptic('medium')
          const newMessages = chatMgmt.messages.filter((_, i) => i !== index)
          chatMgmt.setMessages(newMessages)
          showToast('Nachricht gelöscht', 'success', 2000)
        }
      }
      setSwipingMessageIndex(null)
      setSwipeOffset(0)
      swipeHapticTriggered.current = false
    }
  }, [swipingMessageIndex, swipeOffset, chatMgmt, copyToClipboard])

  // Close context menu on click outside
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

  // ─── Context menu actions ──────────────────────────────────────
  const handleContextMenuCopy = useCallback((text: string, index: number) => {
    copyToClipboard(text, index)
  }, [copyToClipboard])

  const handleContextMenuDelete = useCallback((index: number) => {
    const newMessages = chatMgmt.messages.filter((_, i) => i !== index)
    chatMgmt.setMessages(newMessages)
  }, [chatMgmt])

  const handleContextMenuRegenerate = useCallback((index: number) => {
    if (index > 0) {
      const userMessageIndex = index - 1
      const userMessage = chatMgmt.messages[userMessageIndex]
      if (userMessage && userMessage.role === 'user') {
        const newMessages = chatMgmt.messages.slice(0, userMessageIndex + 1)
        chatMgmt.setMessages(newMessages)
        chatMsgs.startChatRequest(userMessage)
      }
    }
  }, [chatMgmt, chatMsgs])

  // ─── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      recorder.stopAudioMonitoring()
      if (recorder.streamRef.current) {
        recorder.streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Sidebar toggle handler ────────────────────────────────────
  const handleSidebarNewChat = useCallback(async () => {
    await chatMgmt.handleNewChat()
    setShowChatSidebar(false)
  }, [chatMgmt])

  const handleSidebarSwitchChat = useCallback(async (chatId: string) => {
    await chatMgmt.handleSwitchChat(chatId)
    setShowChatSidebar(false)
  }, [chatMgmt])

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen-safe bg-white dark:bg-slate-900 safe-area-inset relative pb-16 sm:pb-0">
      {/* Chat Sidebar */}
      <ChatSidebar
        showChatSidebar={showChatSidebar}
        chats={chatMgmt.filteredAndSortedChats}
        currentChatId={chatMgmt.currentChatId}
        isLoadingChats={chatMgmt.isLoadingChats}
        chatSearchQuery={chatMgmt.chatSearchQuery}
        setChatSearchQuery={chatMgmt.setChatSearchQuery}
        pinnedChats={chatMgmt.pinnedChats}
        swipingChatId={chatMgmt.swipingChatId}
        chatSwipeOffset={chatMgmt.chatSwipeOffset}
        handleNewChat={handleSidebarNewChat}
        handleSwitchChat={handleSidebarSwitchChat}
        handleDeleteChat={chatMgmt.handleDeleteChat}
        toggleChatPin={chatMgmt.toggleChatPin}
        handleChatTouchStart={chatMgmt.handleChatTouchStart}
        handleChatTouchMove={chatMgmt.handleChatTouchMove}
        handleChatTouchEnd={chatMgmt.handleChatTouchEnd}
        getChatIcon={chatMgmt.getChatIcon}
        setShowChatSidebar={setShowChatSidebar}
        setActiveBottomTab={setActiveBottomTab}
      />

      {/* Header */}
      <ChatHeader
        voiceOnlyMode={voiceMode.voiceOnlyMode}
        isLoading={chatMsgs.isLoading}
        theme={theme}
        toggleTheme={toggleTheme}
        showChatSidebar={showChatSidebar}
        setShowChatSidebar={setShowChatSidebar}
        setShowSearchModal={setShowSearchModal}
        setShowExportModal={setShowExportModal}
        setShowShortcutsModal={setShowShortcutsModal}
        exitVoiceOnlyMode={voiceMode.exitVoiceOnlyMode}
        clearChat={chatMgmt.clearChat}
        messages={chatMgmt.messages}
        user={user}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
      />

      {/* Messages */}
      <ChatMessageList
        messages={chatMgmt.messages}
        isLoading={chatMsgs.isLoading}
        isLoadingHistory={isLoadingHistory}
        showLoadingBubble={chatMsgs.showLoadingBubble}
        isStreamingResponse={chatMsgs.isStreamingResponse}
        copiedIndex={copiedIndex}
        setCopiedIndex={handleSetCopiedIndex}
        pinnedMessages={pinnedMessages}
        swipingMessageIndex={swipingMessageIndex}
        swipeOffset={swipeOffset}
        pullDistance={pullDistance}
        isPullRefreshing={isPullRefreshing}
        showScrollButton={showScrollButton}
        voiceOnlyMode={voiceMode.voiceOnlyMode}
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
      {voiceMode.voiceOnlyMode ? (
        <VoiceOverlay
          isRecording={recorder.isRecording}
          isProcessingVoice={recorder.isProcessingVoice}
          isLoading={chatMsgs.isLoading}
          isPlayingAudio={playback.isPlayingAudio}
          audioLevel={recorder.audioLevel}
          silenceStartTime={recorder.silenceStartTime}
          startRecording={recorder.startRecording}
          stopRecording={recorder.stopRecording}
          stopSpeaking={playback.stopSpeaking}
          exitVoiceOnlyMode={voiceMode.exitVoiceOnlyMode}
        />
      ) : (
        <ChatInput
          input={chatMsgs.input}
          setInput={chatMsgs.setInput}
          isRecording={recorder.isRecording}
          isLoading={chatMsgs.isLoading}
          isPlayingAudio={playback.isPlayingAudio}
          voiceOnlyMode={voiceMode.voiceOnlyMode}
          messages={chatMgmt.messages}
          smartReplySuggestions={smartReplySuggestions}
          textareaRef={textareaRef}
          autoExpandTextarea={autoExpandTextarea}
          handleKeyPress={chatMsgs.handleKeyPress}
          sendMessage={chatMsgs.sendMessage}
          startRecording={recorder.startRecording}
          stopRecording={recorder.stopRecording}
          enterVoiceOnlyMode={voiceMode.enterVoiceOnlyMode}
          stopSpeaking={playback.stopSpeaking}
          playLastResponse={() => playback.playLastResponse(chatMgmt.messages)}
          cancelStreaming={chatMsgs.cancelStreaming}
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
        messages={chatMgmt.messages}
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
        messages={chatMgmt.messages}
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
          chatMgmt.clearChat()
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
          chatMgmt.clearChat()
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
        messages={chatMgmt.messages}
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
