'use client'

/**
 * ChatSidebar — Slide-in panel with chat history, search, and management.
 *
 * Renders the sidebar with:
 * - Search bar for filtering chats
 * - Pinned and regular chat list
 * - Swipe-to-delete on mobile
 * - Skeleton loader while chats load
 *
 * Extracted from ChatInterface.tsx for maintainability.
 */

import React from 'react'
import { Plus, Search, X, MessageSquare, Trash2, Pin } from 'lucide-react'
import type { Chat } from '@/types'
import { triggerHaptic } from '@/lib/utils'

interface ChatSidebarProps {
    showChatSidebar: boolean
    chats: Chat[]
    currentChatId: string | null
    isLoadingChats: boolean
    chatSearchQuery: string
    setChatSearchQuery: (q: string) => void
    pinnedChats: Set<string>
    swipingChatId: string | null
    chatSwipeOffset: number
    handleNewChat: () => void
    handleSwitchChat: (id: string) => void
    handleDeleteChat: (id: string, e?: React.MouseEvent) => void
    toggleChatPin: (id: string) => void
    handleChatTouchStart: (e: React.TouchEvent, id: string) => void
    handleChatTouchMove: (e: React.TouchEvent, id: string) => void
    handleChatTouchEnd: (id: string) => void
    getChatIcon: (chat: Chat) => string
    setShowChatSidebar: (show: boolean) => void
    setActiveBottomTab: (tab: 'chat' | 'history' | 'search' | 'settings') => void
}

export default function ChatSidebar({
    showChatSidebar,
    chats,
    currentChatId,
    isLoadingChats,
    chatSearchQuery,
    setChatSearchQuery,
    pinnedChats,
    swipingChatId,
    chatSwipeOffset,
    handleNewChat,
    handleSwitchChat,
    handleDeleteChat,
    toggleChatPin,
    handleChatTouchStart,
    handleChatTouchMove,
    handleChatTouchEnd,
    getChatIcon,
    setShowChatSidebar,
    setActiveBottomTab,
}: ChatSidebarProps) {
    if (!showChatSidebar) return null

    return (
        <div className="fixed inset-0 z-50 flex sm:relative sm:z-auto">
            {/* Overlay for mobile */}
            <div
                className="fixed inset-0 bg-black/50 sm:hidden modal-overlay"
                onClick={() => {
                    triggerHaptic('light')
                    setShowChatSidebar(false)
                    setActiveBottomTab('chat')
                }}
            />
            {/* Sidebar */}
            <div className="w-80 sm:w-96 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col h-full z-50 sm:z-auto sidebar-enter">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Chats</h2>
                        <button
                            onClick={() => {
                                triggerHaptic('medium')
                                handleNewChat()
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all touch-manipulation"
                            title="Neuer Chat"
                        >
                            <Plus className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Chats durchsuchen..."
                            value={chatSearchQuery}
                            onChange={(e) => setChatSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-colors"
                        />
                        {chatSearchQuery && (
                            <button
                                onClick={() => setChatSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                            >
                                <X className="h-3 w-3 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoadingChats ? (
                        <div className="p-2 space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30 relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-600" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-full" />
                                        <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            {chatSearchQuery ? (
                                <>
                                    <Search className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">Keine Chats gefunden</p>
                                    <p className="text-xs mt-1">Versuche es mit anderen Suchbegriffen</p>
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                    <p>Noch keine Chats</p>
                                    <button
                                        onClick={handleNewChat}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Ersten Chat erstellen
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-2">
                            {chats.map((chat) => {
                                const isPinned = pinnedChats.has(chat.id)
                                const isSwiping = swipingChatId === chat.id
                                const icon = getChatIcon(chat)

                                return (
                                    <div
                                        key={chat.id}
                                        className="relative mb-2 overflow-hidden rounded-lg"
                                        onTouchStart={(e) => handleChatTouchStart(e, chat.id)}
                                        onTouchMove={(e) => handleChatTouchMove(e, chat.id)}
                                        onTouchEnd={() => handleChatTouchEnd(chat.id)}
                                    >
                                        {/* Swipe Delete Background */}
                                        <div className={`absolute inset-0 bg-red-500 flex items-center justify-end pr-4 transition-opacity ${isSwiping && chatSwipeOffset < -30 ? 'opacity-100' : 'opacity-0'
                                            }`}>
                                            <Trash2 className="h-5 w-5 text-white" />
                                        </div>

                                        {/* Chat Item */}
                                        <div
                                            onClick={() => handleSwitchChat(chat.id)}
                                            className={`relative bg-white dark:bg-slate-800 p-3 cursor-pointer transition-all group border ${chat.id === currentChatId
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border-transparent'
                                                }`}
                                            style={{
                                                transform: isSwiping ? `translateX(${chatSwipeOffset}px)` : undefined,
                                                transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Chat Icon */}
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl ${chat.id === currentChatId
                                                    ? 'bg-blue-100 dark:bg-blue-800/40'
                                                    : 'bg-gray-100 dark:bg-slate-700'
                                                    }`}>
                                                    {icon}
                                                </div>

                                                {/* Chat Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className={`font-medium truncate flex items-center gap-1.5 ${chat.id === currentChatId
                                                            ? 'text-blue-900 dark:text-blue-100'
                                                            : 'text-gray-900 dark:text-slate-100'
                                                            }`}>
                                                            {isPinned && (
                                                                <Pin className="h-3 w-3 text-purple-500 fill-current flex-shrink-0" />
                                                            )}
                                                            <span className="truncate">{chat.title}</span>
                                                        </p>
                                                        <span className="text-[10px] text-gray-500 dark:text-slate-400 flex-shrink-0">
                                                            {new Date(chat.updatedAt).toLocaleDateString('de-DE', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                            })}
                                                        </span>
                                                    </div>

                                                    {/* Last Message Preview */}
                                                    {chat.lastMessage && (
                                                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate mb-1">
                                                            {chat.lastMessage}
                                                        </p>
                                                    )}

                                                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                                                        {chat.messageCount} {chat.messageCount === 1 ? 'Nachricht' : 'Nachrichten'}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleChatPin(chat.id)
                                                        }}
                                                        className={`p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors ${isPinned ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'
                                                            }`}
                                                        title={isPinned ? 'Nicht mehr anpinnen' : 'Anpinnen'}
                                                    >
                                                        <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteChat(chat.id, e)}
                                                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                        title="Chat löschen"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
