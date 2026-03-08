'use client'

import { useRef, useCallback } from 'react'
import { APP_CONFIG } from '@/lib/constants'
import { delay, formatTextForSpeech } from '@/lib/utils'
import { showToast } from '@/lib/toast'

interface UseAudioPlaybackOptions {
    /** Get auth headers for TTS API calls */
    getAuthHeaders: () => Promise<Record<string, string>>
    /** Whether voice-only mode is active (ref-based for reliability) */
    voiceOnlyModeRef: React.MutableRefObject<boolean>
    /** Whether currently recording */
    isRecording: boolean
    /** Whether chat is loading */
    isLoading: boolean
    /** Whether voice-only mode is active (state-based, for UI) */
    voiceOnlyMode: boolean
    /** Start recording after speech ends in voice-only mode */
    startRecording: () => Promise<void>
}

interface UseAudioPlaybackReturn {
    isPlayingAudio: boolean
    isGeneratingTTS: boolean
    speakText: (text: string) => Promise<void>
    stopSpeaking: () => void
    playLastResponse: (messages: Array<{ role: string; content: string }>) => void
    unlockAudioForIOS: () => void
    audioRef: React.MutableRefObject<HTMLAudioElement | null>
}

export function useAudioPlayback({
    getAuthHeaders,
    voiceOnlyModeRef,
    isRecording,
    isLoading,
    voiceOnlyMode,
    startRecording,
}: UseAudioPlaybackOptions): UseAudioPlaybackReturn {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const isPlayingAudioRef = useRef(false)
    const isGeneratingTTSRef = useRef(false)

    // For parent component state sync
    const setIsPlayingAudio = useCallback((value: boolean) => {
        isPlayingAudioRef.current = value
    }, [])

    const setIsGeneratingTTS = useCallback((value: boolean) => {
        isGeneratingTTSRef.current = value
    }, [])

    const unlockAudioForIOS = useCallback(() => {
        const silentAudio = new Audio()
        silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onr2+wL29vb29ubi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4t7e3t7e3t7e3t7e3'
        silentAudio.volume = 0.01
        silentAudio.play().then(() => silentAudio.pause()).catch(() => { })
    }, [])

    const speakText = useCallback(async (text: string) => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
            setIsPlayingAudio(false)
        }

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel()
        }

        let audioUrl: string | null = null
        let fallbackTimeout: number | null = null

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

            utterance.onerror = () => {
                setIsPlayingAudio(false)
            }

            window.speechSynthesis.speak(utterance)
        }

        try {
            setIsGeneratingTTS(true)
            const preparedText = formatTextForSpeech(text)

            if (isIOS) {
                speakWithWebSpeech(preparedText)
                return
            }

            const ttsStartTime = Date.now()
            let ttsResponse: Response | null = null
            let ttsError: Error | null = null

            for (let attempt = 0; attempt < APP_CONFIG.TTS_MAX_ATTEMPTS; attempt++) {
                try {
                    const authHeaders = await getAuthHeaders()
                    const candidate = await fetch('/api/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
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

            const audioBlob = await ttsResponse.blob()
            audioUrl = URL.createObjectURL(audioBlob)

            const audio = new Audio()
            audioRef.current = audio
            const urlToCleanup = audioUrl

            setIsPlayingAudio(true)
            setIsGeneratingTTS(false)

            audio.onplay = () => {
                if (fallbackTimeout) {
                    window.clearTimeout(fallbackTimeout)
                    fallbackTimeout = null
                }
                const playbackDelayMs = Date.now() - ttsStartTime
                if (playbackDelayMs > APP_CONFIG.TTS_FALLBACK_DELAY_MS) {
                    audio.playbackRate = APP_CONFIG.TTS_SLOW_RATE
                }
                setIsPlayingAudio(true)
            }

            audio.onended = () => {
                setIsPlayingAudio(false)
                audioRef.current = null
                if (urlToCleanup) URL.revokeObjectURL(urlToCleanup)
                if (fallbackTimeout) {
                    window.clearTimeout(fallbackTimeout)
                    fallbackTimeout = null
                }
                if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
                    setTimeout(() => {
                        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
                            startRecording()
                        }
                    }, 500)
                }
            }

            audio.onerror = () => {
                setIsPlayingAudio(false)
                setIsGeneratingTTS(false)
                audioRef.current = null
                if (urlToCleanup) URL.revokeObjectURL(urlToCleanup)
                if (fallbackTimeout) {
                    window.clearTimeout(fallbackTimeout)
                    fallbackTimeout = null
                }
                if (!voiceOnlyMode) {
                    showToast('Audio konnte nicht abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
                }
            }

            audio.src = audioUrl
            audio.preload = 'auto'
            audio.playbackRate = 1.0

            let playAttempted = false
            const attemptPlay = async () => {
                if (playAttempted) return
                playAttempted = true

                try {
                    await audio.play()
                } catch (playError: any) {
                    if (playError.name === 'NotAllowedError') {
                        setIsPlayingAudio(false)
                        audioRef.current = null
                        if (urlToCleanup) URL.revokeObjectURL(urlToCleanup)
                        if (fallbackTimeout) {
                            window.clearTimeout(fallbackTimeout)
                            fallbackTimeout = null
                        }
                        try {
                            speakWithWebSpeech(preparedText)
                        } catch {
                            // Web Speech fallback also failed
                        }
                        setIsGeneratingTTS(false)
                        if (!voiceOnlyMode) {
                            showToast('Die Audiowiedergabe wurde vom Browser blockiert. Bitte interagiere zuerst mit der Seite.', 'warning', 5000)
                        }
                    } else {
                        setTimeout(async () => {
                            try {
                                await audio.play()
                            } catch {
                                setIsPlayingAudio(false)
                                audioRef.current = null
                                if (urlToCleanup) URL.revokeObjectURL(urlToCleanup)
                                if (!voiceOnlyMode) {
                                    showToast('Audio konnte nicht abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
                                }
                            }
                        }, 200)
                    }
                }
            }

            if (audio.readyState >= 3) {
                attemptPlay()
            } else {
                audio.addEventListener('canplay', attemptPlay, { once: true })
            }

            fallbackTimeout = window.setTimeout(() => {
                try {
                    if (audioRef.current) {
                        audioRef.current.pause()
                        audioRef.current.currentTime = 0
                        audioRef.current = null
                    }
                    if (urlToCleanup) URL.revokeObjectURL(urlToCleanup)
                    speakWithWebSpeech(preparedText)
                } catch {
                    // Final fallback failed
                }
            }, APP_CONFIG.TTS_FALLBACK_DELAY_MS)
        } catch (error) {
            console.error('TTS error:', error)
            setIsPlayingAudio(false)
            setIsGeneratingTTS(false)
            if (fallbackTimeout) window.clearTimeout(fallbackTimeout)
            if (audioUrl) URL.revokeObjectURL(audioUrl)
            if (audioRef.current) audioRef.current = null
            try {
                speakWithWebSpeech(formatTextForSpeech(text))
            } catch {
                // Final fallback failed
            }
            if (!voiceOnlyMode) {
                showToast('Audio konnte nicht erzeugt oder abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording, isLoading, voiceOnlyMode, getAuthHeaders, voiceOnlyModeRef, startRecording, setIsPlayingAudio, setIsGeneratingTTS])

    const stopSpeaking = useCallback(() => {
        if (audioRef.current) {
            try {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            } catch {
                // Audio already gone
            }
            audioRef.current = null
        }
        setIsPlayingAudio(false)

        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
            setTimeout(() => {
                if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
                    startRecording()
                }
            }, 300)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording, isLoading, voiceOnlyModeRef, startRecording, setIsPlayingAudio])

    const playLastResponse = useCallback((messages: Array<{ role: string; content: string }>) => {
        unlockAudioForIOS()
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
        if (lastAssistant) {
            speakText(lastAssistant.content)
        }
    }, [speakText, unlockAudioForIOS])

    return {
        get isPlayingAudio() { return isPlayingAudioRef.current },
        get isGeneratingTTS() { return isGeneratingTTSRef.current },
        speakText,
        stopSpeaking,
        playLastResponse,
        unlockAudioForIOS,
        audioRef,
    }
}
