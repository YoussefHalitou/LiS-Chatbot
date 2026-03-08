'use client'

/**
 * VoiceOverlay — Full-screen voice-only mode input area.
 *
 * Renders the immersive voice interaction UI with:
 * - Recording state: audio level visualization, waveform bars, silence countdown
 * - Processing state: transcription/thinking spinner
 * - Playing state: audio playback waveform with interrupt button
 * - Idle state: start recording button + voice command hints
 *
 * Extracted from ChatInterface.tsx for maintainability.
 */

import React from 'react'
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react'
import { APP_CONFIG } from '@/lib/constants'
import { triggerHaptic } from '@/lib/utils'

interface VoiceOverlayProps {
    isRecording: boolean
    isProcessingVoice: boolean
    isLoading: boolean
    isPlayingAudio: boolean
    audioLevel: number
    silenceStartTime: number | null
    startRecording: () => void
    stopRecording: () => void
    stopSpeaking: () => void
    exitVoiceOnlyMode: () => void
}

export default function VoiceOverlay({
    isRecording,
    isProcessingVoice,
    isLoading,
    isPlayingAudio,
    audioLevel,
    silenceStartTime,
    startRecording,
    stopRecording,
    stopSpeaking,
    exitVoiceOnlyMode,
}: VoiceOverlayProps) {
    return (
        <div className="bg-blue-600 border-t border-blue-700 px-3 py-6 sm:px-4 sm:py-6 safe-area-inset-bottom">
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col items-center gap-4">
                    {isRecording ? (
                        <>
                            {/* Audio Level Visualization - Improved */}
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl overflow-hidden animate-pulse-recording">
                                {/* Ripple effect */}
                                <div
                                    className="absolute inset-0 rounded-full bg-red-400 transition-transform duration-150"
                                    style={{
                                        transform: `scale(${0.6 + audioLevel * 0.5})`,
                                        opacity: 0.3 + audioLevel * 0.3
                                    }}
                                />
                                <div
                                    className="absolute inset-0 rounded-full bg-red-300 transition-transform duration-200"
                                    style={{
                                        transform: `scale(${0.4 + audioLevel * 0.3})`,
                                        opacity: 0.2 + audioLevel * 0.2
                                    }}
                                />
                                <MicOff className="h-12 w-12 sm:h-14 sm:w-14 text-white relative z-10 drop-shadow-lg" />
                            </div>

                            {/* Voice Wave Animation Bars */}
                            <div className="flex items-end justify-center gap-1 h-8">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 rounded-full transition-all ${audioLevel > 0.1 ? 'voice-wave-bar bg-white' : 'bg-white/40'
                                            }`}
                                        style={{
                                            height: audioLevel > 0.1 ? `${12 + audioLevel * 16}px` : '8px',
                                            animationDelay: `${i * 0.1}s`,
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="text-center">
                                <p className="text-white text-xl sm:text-2xl font-semibold mb-1">
                                    {audioLevel > 0.1 ? '🎤 Ich höre dich!' : 'Ich höre zu ...'}
                                </p>
                                <p className="text-blue-100 text-sm sm:text-base">
                                    {audioLevel > 0.1 ? 'Sprich weiter...' : 'Warte auf deine Stimme ...'}
                                </p>
                                {silenceStartTime && (
                                    <p className="text-blue-200 text-xs mt-2 bg-blue-700/30 px-3 py-1 rounded-full inline-block">
                                        ⏱️ Stopp in {Math.max(0, Math.ceil((APP_CONFIG.SILENCE_DURATION_MS - (Date.now() - silenceStartTime)) / 1000))}s
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    triggerHaptic('medium')
                                    stopRecording()
                                }}
                                className="px-8 py-3.5 bg-white text-red-600 rounded-2xl font-semibold touch-manipulation active:scale-95 shadow-lg transition-transform text-base"
                            >
                                Aufnahme stoppen
                            </button>
                        </>
                    ) : isProcessingVoice || isLoading ? (
                        <>
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl">
                                <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 text-white animate-spin drop-shadow-lg" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-xl sm:text-2xl font-semibold mb-1">
                                    {isProcessingVoice ? '🎯 Verarbeite...' : '💭 Denke nach...'}
                                </p>
                                <p className="text-blue-100 text-sm sm:text-base">
                                    {isProcessingVoice ? 'Transkribiere deine Stimme' : 'Antwort wird erstellt'}
                                </p>
                            </div>
                        </>
                    ) : isPlayingAudio ? (
                        <>
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-xl animate-pulse-recording">
                                <Volume2 className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg" />
                            </div>

                            {/* Speaking wave animation */}
                            <div className="flex items-center justify-center gap-1 h-8">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 bg-white rounded-full voice-wave-bar"
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    />
                                ))}
                            </div>

                            <div className="text-center">
                                <p className="text-white text-xl sm:text-2xl font-semibold mb-1">
                                    🔊 Assistent spricht
                                </p>
                                <p className="text-blue-100 text-sm sm:text-base mb-4">
                                    Höre dir die Antwort an
                                </p>
                                <button
                                    onClick={() => {
                                        triggerHaptic('medium')
                                        stopSpeaking()
                                    }}
                                    className="px-8 py-3.5 bg-white text-green-600 rounded-2xl font-semibold touch-manipulation active:scale-95 shadow-lg transition-transform text-base"
                                >
                                    Unterbrechen &amp; sprechen
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white flex items-center justify-center shadow-xl">
                                <Mic className="h-12 w-12 sm:h-14 sm:w-14 text-blue-600 drop-shadow" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-xl sm:text-2xl font-semibold mb-1">
                                    👋 Bereit zuzuhören
                                </p>
                                <p className="text-blue-100 text-sm sm:text-base">
                                    Tippe den Button, um zu sprechen
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    triggerHaptic('heavy')
                                    startRecording()
                                }}
                                className="px-8 py-3.5 bg-white text-blue-600 rounded-2xl font-semibold touch-manipulation active:scale-95 shadow-lg transition-transform text-base"
                            >
                                🎤 Jetzt sprechen
                            </button>

                            {/* Voice Command Hints */}
                            <div className="mt-4 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                <p className="text-white/90 text-xs font-semibold mb-2 text-center">💡 Sprachbefehle</p>
                                <div className="space-y-1 text-white/70 text-[11px]">
                                    <p>• Sage &quot;Stop&quot; zum Beenden</p>
                                    <p>• Sage &quot;Wiederholen&quot; für letzte Antwort</p>
                                    <p>• Spreche klar und deutlich</p>
                                </div>
                            </div>
                        </>
                    )}
                    <button
                        onClick={exitVoiceOnlyMode}
                        className="text-white/80 text-sm mt-2 underline-offset-4 hover:underline focus:underline"
                        type="button"
                    >
                        Zum Textmodus wechseln
                    </button>
                </div>
            </div>
        </div>
    )
}
