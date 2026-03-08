'use client'

/**
 * ChatInput — Text input area with send, mic, audio playback, and smart replies.
 *
 * Renders:
 * - Recording indicator bar (when recording in text mode)
 * - Smart reply suggestion chips
 * - Auto-expanding textarea with character counter
 * - Emoji picker, voice mode, audio playback, cancel, and send buttons
 *
 * Extracted from ChatInterface.tsx for maintainability.
 */

import React from 'react'
import { Mic, MicOff, Volume2, Send, Loader2, X, Sparkles } from 'lucide-react'
import EmojiPicker from '@/components/EmojiPicker'
import { APP_CONFIG, UI_CONFIG } from '@/lib/constants'
import { triggerHaptic } from '@/lib/utils'

interface ChatInputProps {
    input: string
    setInput: (value: string) => void
    isRecording: boolean
    isLoading: boolean
    isPlayingAudio: boolean
    voiceOnlyMode: boolean
    messages: any[]
    smartReplySuggestions: string[]
    textareaRef: React.RefObject<HTMLTextAreaElement>
    autoExpandTextarea: () => void
    handleKeyPress: (e: React.KeyboardEvent) => void
    sendMessage: () => void
    startRecording: () => void
    stopRecording: () => void
    enterVoiceOnlyMode: () => void
    stopSpeaking: () => void
    playLastResponse: () => void
    cancelStreaming: (message?: string) => void
    handleSmartReplyClick: (suggestion: string) => void
    handleEmojiSelect: (emoji: string) => void
    setShowSmartReplies: (show: boolean) => void
}

export default function ChatInput({
    input,
    setInput,
    isRecording,
    isLoading,
    isPlayingAudio,
    voiceOnlyMode,
    messages,
    smartReplySuggestions,
    textareaRef,
    autoExpandTextarea,
    handleKeyPress,
    sendMessage,
    startRecording,
    stopRecording,
    enterVoiceOnlyMode,
    stopSpeaking,
    playLastResponse,
    cancelStreaming,
    handleSmartReplyClick,
    handleEmojiSelect,
    setShowSmartReplies,
}: ChatInputProps) {
    return (
        <div className="glass-header border-t border-gray-100 dark:border-slate-800 px-3 py-3 sm:px-4 sm:py-3 safe-area-inset-bottom">
            <div className="max-w-3xl mx-auto">
                {/* Recording indicator with waveform */}
                {isRecording && !voiceOnlyMode && (
                    <div className="mb-3 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-center gap-1 h-8">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-red-500 dark:bg-red-400 rounded-full voice-wave-bar"
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                />
                            ))}
                        </div>
                        <span className="text-red-600 dark:text-red-400 font-medium text-sm flex-1">
                            Aufnahme läuft...
                        </span>
                        <span className="text-red-500 dark:text-red-400 text-xs animate-pulse">
                            ● REC
                        </span>
                    </div>
                )}

                {/* Smart Reply Suggestions */}
                {smartReplySuggestions.length > 0 && !isRecording && messages.length > 0 && (
                    <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                        {smartReplySuggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleSmartReplyClick(suggestion)}
                                className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 active:scale-95 transition-all touch-manipulation shadow-sm"
                            >
                                {suggestion}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowSmartReplies(false)}
                            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            title="Vorschläge ausblenden"
                        >
                            <X className="h-3 w-3 text-gray-400" />
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2.5 sm:gap-2">
                    <div className="flex-1 relative input-gradient-focus">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value)
                                autoExpandTextarea()
                            }}
                            onKeyPress={handleKeyPress}
                            placeholder="Nachricht eingeben..."
                            className="w-full p-3 sm:p-3 pr-14 sm:pr-12 pb-10 sm:pb-8 border-2 border-gray-200 dark:border-slate-600 rounded-xl sm:rounded-lg resize-none focus:outline-none focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-[16px] sm:text-[15px] transition-all shadow-sm focus:shadow-md overflow-y-auto"
                            rows={1}
                            maxLength={APP_CONFIG.MAX_INPUT_LENGTH}
                            style={{
                                minHeight: `${UI_CONFIG.TEXTAREA_MIN_HEIGHT}px`,
                                maxHeight: `120px`
                            }}
                        />
                        {/* Bottom row: hints and character count */}
                        <div className="absolute bottom-2 left-3 right-3 sm:bottom-1.5 sm:left-2 sm:right-2 flex items-center justify-between gap-2 pointer-events-none">
                            <span className="hidden sm:block text-[10px] text-gray-400 dark:text-slate-500 italic">
                                Shift+Enter für neue Zeile
                            </span>
                            <span className={`text-[11px] sm:text-xs font-medium transition-colors ml-auto ${input.length > APP_CONFIG.MAX_INPUT_LENGTH * 0.9
                                ? 'text-red-500'
                                : input.length > APP_CONFIG.MAX_INPUT_LENGTH * 0.75
                                    ? 'text-orange-500'
                                    : 'text-gray-400 dark:text-slate-500'
                                }`}>
                                {input.length} / {APP_CONFIG.MAX_INPUT_LENGTH}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-1.5 flex-shrink-0">
                        {/* Emoji Picker */}
                        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                        <button
                            onClick={() => {
                                triggerHaptic(isRecording ? 'medium' : 'heavy')
                                if (isRecording) {
                                    stopRecording()
                                } else {
                                    enterVoiceOnlyMode()
                                }
                            }}
                            disabled={isLoading}
                            className={`p-3 sm:p-2.5 rounded-xl sm:rounded-lg transition-all duration-150 touch-manipulation active:scale-95 ${isRecording
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 active:bg-gray-200 dark:active:bg-slate-600'
                                } disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center`}
                            title={isRecording ? 'Aufnahme stoppen' : 'Sprachmodus starten'}
                            aria-label={isRecording ? 'Aufnahme stoppen' : 'Sprachmodus starten'}
                        >
                            {isRecording ? (
                                <MicOff className="h-5 w-5 sm:h-5 sm:w-5" />
                            ) : (
                                <Mic className="h-5 w-5 sm:h-5 sm:w-5" />
                            )}
                        </button>

                        {messages.length > 0 && (
                            <button
                                onClick={() => {
                                    triggerHaptic('light')
                                    if (isPlayingAudio) {
                                        stopSpeaking()
                                    } else {
                                        playLastResponse()
                                    }
                                }}
                                disabled={isLoading}
                                className={`p-3 sm:p-2.5 rounded-xl sm:rounded-lg transition-all duration-150 touch-manipulation active:scale-95 ${isPlayingAudio
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 active:bg-gray-200 dark:active:bg-slate-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center`}
                                title={isPlayingAudio ? 'Audio stoppen' : 'Letzte Antwort anhören'}
                                aria-label={isPlayingAudio ? 'Audio stoppen' : 'Letzte Antwort anhören'}
                            >
                                <Volume2 className="h-5 w-5 sm:h-5 sm:w-5" />
                            </button>
                        )}

                        {isLoading && (
                            <button
                                onClick={() => cancelStreaming()}
                                className="p-3 sm:p-2.5 rounded-xl sm:rounded-lg bg-red-50 text-red-600 active:bg-red-100 transition-all duration-150 touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                                title="Anfrage abbrechen"
                                aria-label="Anfrage abbrechen"
                            >
                                <X className="h-5 w-5 sm:h-5 sm:w-5" />
                            </button>
                        )}

                        <button
                            onClick={() => {
                                triggerHaptic('medium')
                                sendMessage()
                            }}
                            disabled={!input.trim() || isLoading}
                            className="p-3 sm:p-2.5 bg-blue-600 active:bg-blue-700 text-white rounded-xl sm:rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 shadow-sm active:shadow min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Nachricht senden"
                            aria-label="Nachricht senden"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 sm:h-5 sm:w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5 sm:h-5 sm:w-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
