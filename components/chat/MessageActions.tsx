'use client'

import { Copy, Share2, Pin, RotateCcw, Trash2 } from 'lucide-react'
import { Message } from '@/types'
import { triggerHaptic } from '@/lib/utils'
import { showToast } from '@/lib/toast'

interface MessageActionsProps {
    messages: Message[]
    contextMenu: { x: number; y: number; messageIndex: number } | null
    setContextMenu: (menu: { x: number; y: number; messageIndex: number } | null) => void
    pinnedMessages: Set<number>
    setPinnedMessages: React.Dispatch<React.SetStateAction<Set<number>>>
    reactionPicker: { messageIndex: number; x: number; y: number } | null
    setReactionPicker: (picker: { messageIndex: number; x: number; y: number } | null) => void
    onCopy: (text: string, index: number) => void
    onDelete: (index: number) => void
    onRegenerate: (index: number) => void
    onAddReaction: (messageIndex: number, emoji: string) => void
}

const REACTION_EMOJIS = ['👍', '❤️', '😄', '🤔', '🎉', '👏']

export default function MessageActions({
    messages,
    contextMenu,
    setContextMenu,
    pinnedMessages,
    setPinnedMessages,
    reactionPicker,
    setReactionPicker,
    onCopy,
    onDelete,
    onRegenerate,
    onAddReaction,
}: MessageActionsProps) {
    const handleAction = (action: 'copy' | 'share' | 'delete' | 'pin' | 'regenerate') => {
        if (!contextMenu) return
        const message = messages[contextMenu.messageIndex]

        switch (action) {
            case 'copy':
                triggerHaptic('light')
                onCopy(message.content, contextMenu.messageIndex)
                showToast('Nachricht kopiert', 'success', 2000)
                break
            case 'share':
                triggerHaptic('light')
                if (navigator.share) {
                    navigator.share({ text: message.content })
                } else {
                    onCopy(message.content, contextMenu.messageIndex)
                    showToast('Nachricht kopiert (Teilen nicht verfügbar)', 'success', 2000)
                }
                break
            case 'pin':
                triggerHaptic('light')
                setPinnedMessages(prev => {
                    const newSet = new Set(prev)
                    if (newSet.has(contextMenu.messageIndex)) {
                        newSet.delete(contextMenu.messageIndex)
                        showToast('Nachricht nicht mehr angepinnt', 'success', 2000)
                    } else {
                        newSet.add(contextMenu.messageIndex)
                        showToast('Nachricht angepinnt', 'success', 2000)
                    }
                    return newSet
                })
                break
            case 'regenerate':
                if (message.role === 'assistant' && contextMenu.messageIndex > 0) {
                    triggerHaptic('medium')
                    onRegenerate(contextMenu.messageIndex)
                    showToast('Antwort wird neu generiert...', 'info', 2000)
                }
                break
            case 'delete':
                if (message.role === 'user') {
                    triggerHaptic('medium')
                    onDelete(contextMenu.messageIndex)
                    showToast('Nachricht gelöscht', 'success', 2000)
                }
                break
        }
        setContextMenu(null)
    }

    return (
        <>
            {/* Context Menu / Action Sheet */}
            {contextMenu && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 modal-overlay"
                        onClick={() => setContextMenu(null)}
                    />
                    <div
                        className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto z-50 animate-slide-up-fast"
                        style={{
                            left: typeof window !== 'undefined' && window.innerWidth >= 640 ? Math.min(contextMenu.x, window.innerWidth - 220) : undefined,
                            top: typeof window !== 'undefined' && window.innerWidth >= 640 ? Math.min(contextMenu.y, window.innerHeight - 300) : undefined,
                            right: typeof window !== 'undefined' && window.innerWidth >= 640 ? 'auto' : undefined,
                            bottom: typeof window !== 'undefined' && window.innerWidth >= 640 ? 'auto' : 0
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t border-gray-200 dark:border-slate-700 sm:border overflow-hidden pb-safe">
                            <div className="sm:hidden flex justify-center pt-2 pb-1">
                                <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
                            </div>

                            <div className="p-2">
                                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors touch-manipulation" onClick={() => handleAction('copy')}>
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="flex-1 font-medium text-gray-900 dark:text-white">Kopieren</span>
                                </button>

                                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors touch-manipulation" onClick={() => handleAction('share')}>
                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <Share2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="flex-1 font-medium text-gray-900 dark:text-white">Teilen</span>
                                </button>

                                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors touch-manipulation" onClick={() => handleAction('pin')}>
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <Pin className={`h-4 w-4 text-purple-600 dark:text-purple-400 ${pinnedMessages.has(contextMenu.messageIndex) ? 'fill-current' : ''}`} />
                                    </div>
                                    <span className="flex-1 font-medium text-gray-900 dark:text-white">
                                        {pinnedMessages.has(contextMenu.messageIndex) ? 'Nicht mehr anpinnen' : 'Anpinnen'}
                                    </span>
                                </button>

                                {messages[contextMenu.messageIndex]?.role === 'assistant' && (
                                    <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors touch-manipulation" onClick={() => handleAction('regenerate')}>
                                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                            <RotateCcw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <span className="flex-1 font-medium text-gray-900 dark:text-white">Neu generieren</span>
                                    </button>
                                )}

                                {messages[contextMenu.messageIndex]?.role === 'user' && (
                                    <>
                                        <div className="h-px bg-gray-200 dark:bg-slate-700 my-2" />
                                        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors touch-manipulation" onClick={() => handleAction('delete')}>
                                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            </div>
                                            <span className="flex-1 font-medium text-red-600 dark:text-red-400">Löschen</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="sm:hidden px-2 pb-2 pt-1">
                                <button
                                    onClick={() => setContextMenu(null)}
                                    className="w-full py-3.5 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Reaction Picker */}
            {reactionPicker && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setReactionPicker(null)} />
                    <div
                        className="fixed z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-2 animate-scale-up"
                        style={{
                            left: Math.min(reactionPicker.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 250),
                            top: Math.max(50, reactionPicker.y - 60),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex gap-1">
                            {REACTION_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => onAddReaction(reactionPicker.messageIndex, emoji)}
                                    className="w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center text-2xl transition-all active:scale-90"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
