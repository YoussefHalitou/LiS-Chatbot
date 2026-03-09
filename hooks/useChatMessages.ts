'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Message } from '@/types'
import { APP_CONFIG } from '@/lib/constants'
import { sanitizeInput, sanitizeBotResponse, triggerHaptic } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'

/**
 * Get auth headers for API requests.
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

interface UseChatMessagesOptions {
    messages: Message[]
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    currentChatId: string | null
    speakText: (text: string) => Promise<void>
}

interface UseChatMessagesReturn {
    input: string
    setInput: (input: string) => void
    isLoading: boolean
    isStreamingResponse: boolean
    showLoadingBubble: boolean
    isQueryingDatabase: boolean
    sendMessage: () => Promise<void>
    startChatRequest: (userMessage: Message, options?: { speakResponse?: boolean }) => Promise<void>
    cancelStreaming: (message?: string) => void
    handleKeyPress: (e: React.KeyboardEvent) => void
    getAuthHeadersFn: () => Promise<Record<string, string>>
}

export function useChatMessages({
    messages,
    setMessages,
    currentChatId,
    speakText,
}: UseChatMessagesOptions): UseChatMessagesReturn {
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isStreamingResponse, setIsStreamingResponse] = useState(false)
    const [showLoadingBubble, setShowLoadingBubble] = useState(false)
    const [isQueryingDatabase, setIsQueryingDatabase] = useState(false)

    const abortControllerRef = useRef<AbortController | null>(null)
    const streamTimeoutRef = useRef<number | null>(null)
    const loadingBubbleTimeoutRef = useRef<number | null>(null)

    const streamingDisabled = useMemo(
        () =>
            process.env.NEXT_PUBLIC_DISABLE_STREAMING === 'true' ||
            process.env.CHAT_STREAMING_DISABLED === 'true',
        []
    )

    const clearStreamTimeout = useCallback(() => {
        if (streamTimeoutRef.current) {
            clearTimeout(streamTimeoutRef.current)
            streamTimeoutRef.current = null
        }
    }, [])

    const clearLoadingBubbleTimeout = useCallback(() => {
        if (loadingBubbleTimeoutRef.current) {
            clearTimeout(loadingBubbleTimeoutRef.current)
            loadingBubbleTimeoutRef.current = null
        }
    }, [])

    const cancelStreaming = useCallback((message?: string) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

        clearStreamTimeout()
        clearLoadingBubbleTimeout()
        setShowLoadingBubble(false)

        if (message) {
            const timestamp = new Date()
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
    }, [clearStreamTimeout, clearLoadingBubbleTimeout, setMessages])

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
                        setMessages((prev) =>
                            prev.map((msg, idx) =>
                                idx === assistantIndex
                                    ? { ...msg, tool_calls: payload.tool_calls, timestamp: assistantTimestamp }
                                    : msg
                            )
                        )
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
    }, [speakText, setMessages])

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

            if (!streamingDisabled && contentType.includes('text/event-stream')) {
                await readSseStream(response, assistantIndex, { speakResponse })
            } else {
                const data = await response.json()
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
    }, [messages, currentChatId, streamingDisabled, readSseStream, clearLoadingBubbleTimeout, clearStreamTimeout, speakText, setMessages])

    const sendMessage = useCallback(async () => {
        const sanitizedInput = sanitizeInput(input)
        if (!sanitizedInput || isLoading) return

        triggerHaptic('medium')

        const userMessage: Message = {
            role: 'user',
            content: sanitizedInput,
            timestamp: new Date(),
        }

        setInput('')
        await startChatRequest(userMessage)
    }, [input, isLoading, startChatRequest])

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }, [sendMessage])

    return {
        input,
        setInput,
        isLoading,
        isStreamingResponse,
        showLoadingBubble,
        isQueryingDatabase,
        sendMessage,
        startChatRequest,
        cancelStreaming,
        handleKeyPress,
        getAuthHeadersFn: getAuthHeaders,
    }
}
