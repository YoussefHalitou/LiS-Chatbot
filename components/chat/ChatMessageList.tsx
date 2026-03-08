'use client'

import { useCallback, useMemo } from 'react'
import { Copy, Check, Trash2, Pin, RefreshCw, ChevronDown } from 'lucide-react'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'
import EmptyState from '@/components/EmptyState'
import { Message } from '@/types'
import { formatTimestamp, sanitizeBotResponse, triggerHaptic } from '@/lib/utils'
import { showToast } from '@/lib/toast'
import { UI_CONFIG } from '@/lib/constants'

interface ChatMessageListProps {
    messages: Message[]
    isLoading: boolean
    isLoadingHistory: boolean
    showLoadingBubble: boolean
    isStreamingResponse: boolean
    copiedIndex: number | null
    setCopiedIndex: (index: number | null) => void
    pinnedMessages: Set<number>
    swipingMessageIndex: number | null
    swipeOffset: number
    pullDistance: number
    isPullRefreshing: boolean
    showScrollButton: boolean
    voiceOnlyMode: boolean
    reactionPicker: { messageIndex: number; x: number; y: number } | null
    setReactionPicker: (picker: { messageIndex: number; x: number; y: number } | null) => void
    messagesEndRef: React.RefObject<HTMLDivElement>
    messagesContainerRef: React.RefObject<HTMLDivElement>
    onScrollChange: (e: React.UIEvent<HTMLDivElement>) => void
    onPullStart: (e: React.TouchEvent) => void
    onPullMove: (e: React.TouchEvent) => void
    onPullEnd: () => void
    onMessageTouchStart: (e: React.TouchEvent, index: number) => void
    onMessageTouchMove: (e: React.TouchEvent, index: number) => void
    onMessageTouchEnd: (index: number) => void
    onQuickAction: (text: string) => void
    onScrollToBottom: () => void
    onAddReaction: (messageIndex: number, emoji: string) => void
}

export default function ChatMessageList({
    messages,
    isLoading,
    isLoadingHistory,
    showLoadingBubble,
    isStreamingResponse,
    copiedIndex,
    setCopiedIndex,
    pinnedMessages,
    swipingMessageIndex,
    swipeOffset,
    pullDistance,
    isPullRefreshing,
    showScrollButton,
    voiceOnlyMode,
    reactionPicker,
    setReactionPicker,
    messagesEndRef,
    messagesContainerRef,
    onScrollChange,
    onPullStart,
    onPullMove,
    onPullEnd,
    onMessageTouchStart,
    onMessageTouchMove,
    onMessageTouchEnd,
    onQuickAction,
    onScrollToBottom,
    onAddReaction,
}: ChatMessageListProps) {

    const copyToClipboard = useCallback(async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedIndex(index)
            setTimeout(() => setCopiedIndex(null), UI_CONFIG.COPY_FEEDBACK_DURATION_MS)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }, [setCopiedIndex])

    const formatDateSeparator = useCallback((date: Date): string => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        if (messageDate.getTime() === today.getTime()) return 'Heute'
        if (messageDate.getTime() === yesterday.getTime()) return 'Gestern'
        return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    }, [])

    const shouldShowDateSeparator = useCallback((currentIndex: number): boolean => {
        if (currentIndex === 0) return true
        const currentMsg = messages[currentIndex]
        const prevMsg = messages[currentIndex - 1]
        if (!currentMsg.timestamp || !prevMsg.timestamp) return false
        return new Date(currentMsg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString()
    }, [messages])

    return (
        <>
            {/* Messages container */}
            <div
                ref={messagesContainerRef}
                onScroll={onScrollChange}
                onTouchStart={onPullStart}
                onTouchMove={onPullMove}
                onTouchEnd={onPullEnd}
                className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 px-3 py-4 sm:px-4 sm:py-5 overscroll-contain relative"
                style={{ paddingTop: pullDistance > 0 ? `${16 + pullDistance}px` : undefined }}
            >
                {/* Pull-to-refresh indicator */}
                <div
                    className={`pull-refresh-indicator ${pullDistance > 20 ? 'visible' : ''} ${isPullRefreshing ? 'refreshing' : ''}`}
                    style={{ top: pullDistance > 20 ? `${Math.min(pullDistance - 30, 20)}px` : '-50px' }}
                >
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-slate-700">
                        <RefreshCw className={`h-4 w-4 text-blue-600 dark:text-blue-400 ${isPullRefreshing ? 'animate-spin' : ''}`} />
                        <span className="text-sm text-gray-600 dark:text-slate-300">
                            {isPullRefreshing ? 'Aktualisiere...' : pullDistance > 60 ? 'Loslassen zum Aktualisieren' : 'Ziehen zum Aktualisieren'}
                        </span>
                    </div>
                </div>

                {/* Loading skeleton */}
                {isLoadingHistory && (
                    <div className="max-w-3xl mx-auto space-y-4 mb-4 animate-fade-in">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                {i % 2 !== 0 && (
                                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 relative overflow-hidden">
                                        <div className="absolute inset-0 skeleton-shimmer" />
                                    </div>
                                )}
                                <div
                                    className={`relative overflow-hidden rounded-2xl bg-gray-200 dark:bg-slate-700 ${i % 2 === 0 ? 'ml-auto rounded-br-sm' : 'rounded-bl-sm'}`}
                                    style={{ width: `${45 + (i * 8)}%`, height: `${60 + i * 12}px` }}
                                >
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                    <div className="p-3 space-y-2">
                                        <div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-3/4" />
                                        <div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-full" />
                                        {i > 2 && <div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-5/6" />}
                                    </div>
                                </div>
                                {i % 2 === 0 && (
                                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 relative overflow-hidden">
                                        <div className="absolute inset-0 skeleton-shimmer" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {messages.length === 0 && !isLoadingHistory ? (
                    <EmptyState onQuickAction={onQuickAction} />
                ) : (
                    <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
                        {messages.map((message, index) => (
                            message.role === 'assistant' && !message.content ? null : (
                                <div key={index}>
                                    {/* Time Separator */}
                                    {shouldShowDateSeparator(index) && message.timestamp && (
                                        <div className="time-separator my-4">
                                            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 px-3 py-1 rounded-full">
                                                {formatDateSeparator(new Date(message.timestamp))}
                                            </span>
                                        </div>
                                    )}

                                    {/* Swipeable message container */}
                                    <div
                                        className="message-swipe-container"
                                        onTouchStart={(e) => onMessageTouchStart(e, index)}
                                        onTouchMove={(e) => onMessageTouchMove(e, index)}
                                        onTouchEnd={() => onMessageTouchEnd(index)}
                                    >
                                        {/* Swipe action indicators */}
                                        <div className={`message-swipe-action message-swipe-action-left ${swipingMessageIndex === index && swipeOffset > 30 ? 'visible' : ''}`}>
                                            <Copy className="h-5 w-5 text-white" />
                                        </div>
                                        <div className={`message-swipe-action message-swipe-action-right ${swipingMessageIndex === index && swipeOffset < -30 && message.role === 'user' ? 'visible' : ''}`}>
                                            <Trash2 className="h-5 w-5 text-white" />
                                        </div>

                                        <div
                                            className={`message-swipe-content flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-spring-in group`}
                                            style={{ transform: swipingMessageIndex === index ? `translateX(${swipeOffset}px)` : undefined }}
                                        >
                                            {/* Bot Avatar */}
                                            {message.role === 'assistant' && (
                                                <div className="message-avatar message-avatar-bot mb-1">LiS</div>
                                            )}

                                            <div
                                                className={`rounded-2xl relative ${message.role === 'user'
                                                    ? 'max-w-[85%] sm:max-w-[70%] bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-lg px-4 py-3 message-bubble-user'
                                                    : 'max-w-[95%] sm:max-w-[85%] bg-white dark:bg-slate-800/95 text-gray-900 dark:text-slate-100 rounded-bl-md border border-gray-100 dark:border-slate-700/80 shadow-md px-3 py-3 sm:px-5 sm:py-4 message-bubble-bot'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className={`flex-1 overflow-hidden ${message.role === 'user' ? 'text-[15px] leading-relaxed' : 'text-[15px] leading-[1.7]'}`} style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
                                                        {message.role === 'user' ? (
                                                            <p className="whitespace-pre-wrap" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>{message.content}</p>
                                                        ) : (
                                                            <MarkdownRenderer content={message.content} sanitize={sanitizeBotResponse} />
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(message.content, index)}
                                                        className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 sm:p-1 rounded-lg touch-manipulation active:scale-95 flex-shrink-0 ${message.role === 'user'
                                                            ? 'active:bg-blue-700 text-white'
                                                            : 'active:bg-gray-100 dark:active:bg-slate-700 text-gray-600 dark:text-slate-400'
                                                            }`}
                                                        title="Nachricht kopieren"
                                                        aria-label="Nachricht kopieren"
                                                    >
                                                        {copiedIndex === index ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                    </button>
                                                </div>

                                                {/* Timestamp & delivery status */}
                                                {message.timestamp && (
                                                    <div className={`flex items-center gap-1.5 mt-2 sm:mt-1.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <span className={`text-[11px] sm:text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                                                            {formatTimestamp(message.timestamp)}
                                                        </span>
                                                        {message.role === 'user' && <span className="delivery-check delivered" title="Zugestellt">✓✓</span>}
                                                        {pinnedMessages.has(index) && (
                                                            <span title="Angepinnt">
                                                                <Pin className="h-3 w-3 text-purple-500 dark:text-purple-400 fill-current ml-1" />
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Reactions */}
                                                {message.reactions && Object.keys(message.reactions).length > 0 && (
                                                    <div className={`flex items-center gap-1 mt-2 flex-wrap ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        {Object.entries(message.reactions).map(([emoji, count]) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => onAddReaction(index, emoji)}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors active:scale-95"
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="font-medium text-gray-600 dark:text-gray-300">{count}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Reaction Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        setReactionPicker({ messageIndex: index, x: rect.left, y: rect.top - 10 })
                                                        triggerHaptic('light')
                                                    }}
                                                    className={`absolute -bottom-2 ${message.role === 'user' ? 'right-2' : 'left-2'} opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 flex items-center justify-center hover:scale-110 transition-all shadow-md`}
                                                    title="Reaktion hinzufügen"
                                                >
                                                    <span className="text-xs">😊</span>
                                                </button>
                                            </div>

                                            {/* User Avatar */}
                                            {message.role === 'user' && (
                                                <div className="message-avatar message-avatar-user mb-1">Du</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}

                        {/* Loading bubble */}
                        {isLoading && showLoadingBubble && !isStreamingResponse && (
                            <div className="flex justify-start items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="message-avatar message-avatar-bot mb-1">LiS</div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-xl rounded-bl-sm px-4 py-4 sm:px-4 sm:py-3.5 border border-gray-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        <div className="typing-dot" />
                                        <div className="typing-dot" />
                                        <div className="typing-dot" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollButton && !voiceOnlyMode && (
                <button
                    onClick={onScrollToBottom}
                    className="fixed bottom-28 right-4 sm:bottom-24 sm:right-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg active:scale-95 transition-all z-20 touch-manipulation animate-in fade-in slide-in-from-bottom-2 duration-200"
                    aria-label="Nach unten scrollen"
                >
                    <ChevronDown className="h-5 w-5" />
                </button>
            )}
        </>
    )
}
