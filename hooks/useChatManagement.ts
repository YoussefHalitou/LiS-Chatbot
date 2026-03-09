'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Message, Chat } from '@/types'
import {
    getAllChats,
    getChatMessages,
    saveChatMessages,
    createNewChat,
    deleteChat,
    getCurrentChatId,
} from '@/lib/chat-management-supabase'
import { migrateOldChatFormat } from '@/lib/chat-management'
import { triggerHaptic } from '@/lib/utils'
import { showToast } from '@/lib/toast'

interface UseChatManagementReturn {
    chats: Chat[]
    currentChatId: string | null
    isLoadingChats: boolean
    messages: Message[]
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    chatSearchQuery: string
    setChatSearchQuery: (query: string) => void
    pinnedChats: Set<string>
    swipingChatId: string | null
    chatSwipeOffset: number
    filteredAndSortedChats: Chat[]
    handleNewChat: () => Promise<void>
    handleSwitchChat: (chatId: string) => Promise<void>
    handleDeleteChat: (chatId: string, e?: React.MouseEvent) => Promise<void>
    toggleChatPin: (chatId: string) => void
    getChatIcon: (chat: Chat) => string
    handleChatTouchStart: (e: React.TouchEvent, chatId: string) => void
    handleChatTouchMove: (e: React.TouchEvent, chatId: string) => void
    handleChatTouchEnd: (chatId: string) => void
    clearChat: () => Promise<void>
}

export function useChatManagement(isStreamingResponse: boolean): UseChatManagementReturn {
    const [messages, setMessages] = useState<Message[]>([])
    const [chats, setChats] = useState<Chat[]>([])
    const [currentChatId, setCurrentChatIdState] = useState<string | null>(null)
    const [isLoadingChats, setIsLoadingChats] = useState(true)
    const [chatSearchQuery, setChatSearchQuery] = useState('')
    const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set())
    const [swipingChatId, setSwipingChatId] = useState<string | null>(null)
    const [chatSwipeOffset, setChatSwipeOffset] = useState(0)

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedMessagesRef = useRef<string>('')
    const chatTouchStartX = useRef<number>(0)
    const chatTouchStartY = useRef<number>(0)

    // Initialize chats on mount
    useEffect(() => {
        if (typeof window === 'undefined') return

        async function loadChats() {
            setIsLoadingChats(true)
            try {
                migrateOldChatFormat()
                const loadedChats = await getAllChats()

                const enhancedChats = await Promise.all(
                    loadedChats.map(async (chat) => {
                        const chatMsgs = await getChatMessages(chat.id)
                        const lastMessage = chatMsgs.length > 0
                            ? chatMsgs[chatMsgs.length - 1].content.substring(0, 60) + (chatMsgs[chatMsgs.length - 1].content.length > 60 ? '...' : '')
                            : ''
                        return { ...chat, lastMessage }
                    })
                )

                setChats(enhancedChats)

                const currentId = getCurrentChatId()
                if (currentId) {
                    const chatExists = loadedChats.some(c => c.id === currentId)
                    if (chatExists) {
                        setCurrentChatIdState(currentId)
                        const chatMessages = await getChatMessages(currentId)
                        setMessages(chatMessages)
                    } else {
                        const newChat = await createNewChat()
                        setCurrentChatIdState(newChat.id)
                        setChats([newChat, ...loadedChats])
                        setMessages([])
                    }
                } else if (loadedChats.length > 0) {
                    const firstChat = loadedChats[0]
                    setCurrentChatIdState(firstChat.id)
                    const chatMessages = await getChatMessages(firstChat.id)
                    setMessages(chatMessages)
                } else {
                    const newChat = await createNewChat()
                    setCurrentChatIdState(newChat.id)
                    setChats([newChat])
                    setMessages([])
                }
            } finally {
                setIsLoadingChats(false)
            }
        }

        loadChats()
    }, [])

    // Save chat messages with debounce
    useEffect(() => {
        if (typeof window === 'undefined' || !currentChatId) return
        if (isStreamingResponse) return

        const messagesHash = JSON.stringify(messages.map(m => ({ role: m.role, content: m.content })))
        if (messagesHash === lastSavedMessagesRef.current) return

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(async () => {
            if (messages.length > 0 && currentChatId) {
                lastSavedMessagesRef.current = messagesHash
                await saveChatMessages(currentChatId, messages)
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

    const handleNewChat = useCallback(async () => {
        if (currentChatId && messages.length > 0) {
            await saveChatMessages(currentChatId, messages)
        }
        const newChat = await createNewChat()
        setCurrentChatIdState(newChat.id)
        const updatedChats = await getAllChats()
        setChats(updatedChats)
        setMessages([])
    }, [currentChatId, messages])

    const handleSwitchChat = useCallback(async (chatId: string) => {
        if (currentChatId && messages.length > 0) {
            await saveChatMessages(currentChatId, messages)
        }
        setCurrentChatIdState(chatId)
        const chatMessages = await getChatMessages(chatId)
        setMessages(chatMessages)
        const updatedChats = await getAllChats()
        setChats(updatedChats)
    }, [currentChatId, messages])

    const handleDeleteChat = useCallback(async (chatId: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (window.confirm('Möchtest du diesen Chat wirklich löschen?')) {
            await deleteChat(chatId)
            const updatedChats = await getAllChats()
            setChats(updatedChats)

            if (chatId === currentChatId) {
                if (updatedChats.length > 0) {
                    setCurrentChatIdState(updatedChats[0].id)
                    const chatMessages = await getChatMessages(updatedChats[0].id)
                    setMessages(chatMessages)
                } else {
                    const newChat = await createNewChat()
                    setCurrentChatIdState(newChat.id)
                    setChats([newChat])
                    setMessages([])
                }
            }
        }
    }, [currentChatId])

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

    const getChatIcon = useCallback((chat: Chat): string => {
        const title = chat.title.toLowerCase()
        if (title.includes('projekt')) return '📋'
        if (title.includes('mitarbeiter') || title.includes('team')) return '👥'
        if (title.includes('termin') || title.includes('kalender')) return '📅'
        if (title.includes('aufgabe') || title.includes('task')) return '✅'
        if (title.includes('bericht') || title.includes('report')) return '📊'
        return '💬'
    }, [])

    const filteredAndSortedChats = useMemo(() => {
        let filtered = chats
        if (chatSearchQuery.trim()) {
            const query = chatSearchQuery.toLowerCase()
            filtered = chats.filter(chat =>
                chat.title.toLowerCase().includes(query) ||
                chat.lastMessage?.toLowerCase().includes(query)
            )
        }
        return filtered.sort((a, b) => {
            const aPin = pinnedChats.has(a.id)
            const bPin = pinnedChats.has(b.id)
            if (aPin && !bPin) return -1
            if (!aPin && bPin) return 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
    }, [chats, chatSearchQuery, pinnedChats])

    // Chat swipe handlers
    const handleChatTouchStart = useCallback((_e: React.TouchEvent, _chatId: string) => {
        chatTouchStartX.current = _e.touches[0].clientX
        chatTouchStartY.current = _e.touches[0].clientY
    }, [])

    const handleChatTouchMove = useCallback((e: React.TouchEvent, chatId: string) => {
        const deltaX = e.touches[0].clientX - chatTouchStartX.current
        const deltaY = Math.abs(e.touches[0].clientY - chatTouchStartY.current)
        if (deltaY < 30 && Math.abs(deltaX) > 10) {
            setSwipingChatId(chatId)
            setChatSwipeOffset(Math.max(-100, Math.min(0, deltaX)))
        }
    }, [])

    const handleChatTouchEnd = useCallback((chatId: string) => {
        if (swipingChatId === chatId && chatSwipeOffset < -60) {
            triggerHaptic('medium')
            handleDeleteChat(chatId)
        }
        setSwipingChatId(null)
        setChatSwipeOffset(0)
    }, [swipingChatId, chatSwipeOffset, handleDeleteChat])

    return {
        chats,
        currentChatId,
        isLoadingChats,
        messages,
        setMessages,
        chatSearchQuery,
        setChatSearchQuery,
        pinnedChats,
        swipingChatId,
        chatSwipeOffset,
        filteredAndSortedChats,
        handleNewChat,
        handleSwitchChat,
        handleDeleteChat,
        toggleChatPin,
        getChatIcon,
        handleChatTouchStart,
        handleChatTouchMove,
        handleChatTouchEnd,
        clearChat,
    }
}
