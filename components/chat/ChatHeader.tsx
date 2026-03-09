'use client'

/**
 * ChatHeader — Top header bar with branding, controls, and auth buttons.
 *
 * Renders:
 * - LiS branding with online status indicator
 * - Search, export, shortcuts, theme toggle, chat sidebar toggle
 * - Voice-only mode exit button
 * - Auth (login/logout) buttons
 * - Clear chat button
 *
 * Extracted from ChatInterface.tsx for maintainability.
 */

import React from 'react'
import { Search, Download, Keyboard, Moon, Sun, MessageSquare, X, Trash2, User as UserIcon, LogOut } from 'lucide-react'
import ConnectionStatus from '@/components/ConnectionStatus'
import type { User } from '@supabase/supabase-js'
import type { Message } from '@/types'

interface ChatHeaderProps {
    voiceOnlyMode: boolean
    isLoading: boolean
    theme: string
    toggleTheme: () => void
    showChatSidebar: boolean
    setShowChatSidebar: (show: boolean) => void
    setShowSearchModal: (show: boolean) => void
    setShowExportModal: (show: boolean) => void
    setShowShortcutsModal: (show: boolean) => void
    exitVoiceOnlyMode: () => void
    clearChat: () => void
    messages: Message[]
    user?: User | null
    onLoginClick?: () => void
    onLogout?: () => void
}

export default function ChatHeader({
    voiceOnlyMode,
    isLoading,
    theme,
    toggleTheme,
    showChatSidebar,
    setShowChatSidebar,
    setShowSearchModal,
    setShowExportModal,
    setShowShortcutsModal,
    exitVoiceOnlyMode,
    clearChat,
    messages,
    user,
    onLoginClick,
    onLogout,
}: ChatHeaderProps) {
    return (
        <div className={`${voiceOnlyMode ? 'bg-blue-600' : 'glass-header'} px-3 py-3 sm:px-4 sm:py-3 sticky top-0 z-10 safe-area-inset-top transition-colors`}>
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`relative w-11 h-11 sm:w-11 sm:h-11 rounded-xl ${voiceOnlyMode ? 'bg-white' : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600'} flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <span className={`font-bold text-sm sm:text-base ${voiceOnlyMode ? 'text-blue-600' : 'text-white'}`}>LiS</span>
                            {/* Online status dot */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${voiceOnlyMode ? 'border-blue-600' : 'border-white dark:border-slate-900'} ${isLoading ? 'status-dot-connecting' : 'status-dot-online'
                                }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h1 className={`text-base sm:text-lg font-semibold truncate ${voiceOnlyMode ? 'text-white' : 'text-gray-900 dark:text-slate-100'}`}>
                                    {voiceOnlyMode ? 'Sprachmodus' : 'LiS Chatbot'}
                                </h1>
                            </div>
                            <p className={`text-[11px] sm:text-xs truncate ${voiceOnlyMode ? 'text-blue-100' : 'text-gray-500 dark:text-slate-400'}`}>
                                {voiceOnlyMode
                                    ? 'Sprich weiter, um das Gespräch fortzusetzen'
                                    : isLoading
                                        ? 'Antwortet...'
                                        : 'Online • Bereit zu helfen'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {!voiceOnlyMode && (
                            <>
                                <button
                                    onClick={() => setShowSearchModal(true)}
                                    className="p-2 sm:p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0 hidden sm:flex"
                                    title="Suchen (Ctrl+F)"
                                    aria-label="Suchen"
                                >
                                    <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="p-2 sm:p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0 hidden sm:flex"
                                    title="Exportieren (Ctrl+E)"
                                    aria-label="Chat exportieren"
                                >
                                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                                <button
                                    onClick={() => setShowShortcutsModal(true)}
                                    className="p-2 sm:p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0 hidden sm:flex"
                                    title="Tastenkürzel (Ctrl+/)"
                                    aria-label="Tastenkürzel anzeigen"
                                >
                                    <Keyboard className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 sm:p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0 hidden sm:flex"
                                    title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    aria-label="Theme umschalten"
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                                    ) : (
                                        <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    )}
                                </button>
                                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                                <button
                                    onClick={() => setShowChatSidebar(!showChatSidebar)}
                                    className="p-2 sm:p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors touch-manipulation flex-shrink-0 hidden sm:flex"
                                    title="Chats anzeigen"
                                    aria-label="Chats anzeigen"
                                >
                                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            </>
                        )}
                        {!voiceOnlyMode && <ConnectionStatus className="hidden sm:flex" />}
                        {voiceOnlyMode && (
                            <button
                                onClick={exitVoiceOnlyMode}
                                className="p-2.5 sm:p-2 rounded-lg text-white active:bg-blue-700 transition-colors touch-manipulation flex-shrink-0"
                                title="Sprachmodus verlassen"
                                aria-label="Sprachmodus verlassen"
                            >
                                <X className="h-5 w-5 sm:h-5 sm:w-5" />
                            </button>
                        )}
                        {!voiceOnlyMode && messages.length > 0 && (
                            <button
                                onClick={clearChat}
                                className="p-2 sm:p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation flex-shrink-0 hidden sm:flex"
                                title="Chatverlauf löschen"
                                aria-label="Chatverlauf löschen"
                            >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        )}
                        {/* Auth button - integrated in header (desktop only, mobile in settings) */}
                        {!voiceOnlyMode && (
                            <>
                                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                                {user ? (
                                    <button
                                        onClick={onLogout}
                                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation text-xs sm:text-sm font-medium"
                                        title="Abmelden"
                                    >
                                        <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>Abmelden</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={onLoginClick}
                                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-manipulation text-xs sm:text-sm font-medium"
                                        title="Anmelden"
                                    >
                                        <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>Anmelden</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
