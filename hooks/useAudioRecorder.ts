'use client'

import { useRef, useCallback } from 'react'
import { AUDIO_CONFIG, APP_CONFIG, ERROR_MESSAGES } from '@/lib/constants'
import { delay, isValidAudioBlob, getFileExtensionFromMimeType, getMicrophoneErrorMessage, triggerHaptic } from '@/lib/utils'
import { showToast } from '@/lib/toast'

interface UseAudioRecorderOptions {
    /** Get auth headers for API calls */
    getAuthHeaders: () => Promise<Record<string, string>>
    /** Whether voice-only mode is active (ref-based for reliability) */
    voiceOnlyModeRef: React.MutableRefObject<boolean>
    /** Callback when transcription completes in voice-only mode */
    onVoiceOnlyTranscript: (transcript: string) => Promise<void>
    /** Callback when transcription completes in normal mode */
    onTranscript: (transcript: string) => void
}

interface UseAudioRecorderReturn {
    isRecording: boolean
    isProcessingSTT: boolean
    isProcessingVoice: boolean
    audioLevel: number
    silenceStartTime: number | null
    startRecording: () => Promise<void>
    stopRecording: () => void
    startAudioMonitoring: (stream: MediaStream) => void
    stopAudioMonitoring: () => void
    /** Refs that ChatInterface needs access to */
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>
    audioChunksRef: React.MutableRefObject<Blob[]>
    audioContextRef: React.MutableRefObject<AudioContext | null>
    analyserRef: React.MutableRefObject<AnalyserNode | null>
    streamRef: React.MutableRefObject<MediaStream | null>
}

export function useAudioRecorder({
    getAuthHeaders,
    voiceOnlyModeRef,
    onVoiceOnlyTranscript,
    onTranscript,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
    // State stored in refs to avoid re-renders during recording
    const isRecordingRef = useRef(false)
    const isProcessingSTTRef = useRef(false)
    const isProcessingVoiceRef = useRef(false)
    const audioLevelRef = useRef(0)
    const silenceStartTimeRef = useRef<number | null>(null)

    // Audio recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // We need to use a state-like pattern but avoid excessive re-renders.
    // Use a forceUpdate mechanism since the parent component manages visible state.
    const listenerRef = useRef<() => void>(() => { })

    // Expose a way for the parent to subscribe to state changes
    const notifyStateChange = useCallback(() => {
        listenerRef.current()
    }, [])

    const stopAudioMonitoring = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }
        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
        analyserRef.current = null
        silenceStartTimeRef.current = null
        audioLevelRef.current = 0
    }, [])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecordingRef.current) {
            triggerHaptic('medium')
            mediaRecorderRef.current.stop()
        }
    }, [])

    const startAudioMonitoring = useCallback((stream: MediaStream) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const analyser = audioContext.createAnalyser()
            const microphone = audioContext.createMediaStreamSource(stream)

            analyser.fftSize = 2048
            analyser.smoothingTimeConstant = 0.3
            microphone.connect(analyser)

            audioContextRef.current = audioContext
            analyserRef.current = analyser
            streamRef.current = stream
            silenceStartTimeRef.current = null

            const dataArray = new Uint8Array(analyser.fftSize)
            const silenceDuration = APP_CONFIG.SILENCE_DURATION_MS

            let backgroundNoiseLevel = 0
            let samplesCollected = 0
            const calibrationSamples = APP_CONFIG.VAD_CALIBRATION_SAMPLES
            let hasDetectedSpeech = false

            const monitorAudio = () => {
                if (!analyserRef.current || !voiceOnlyModeRef.current || !isRecordingRef.current) {
                    return
                }

                analyserRef.current.getByteTimeDomainData(dataArray)

                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    const normalized = (dataArray[i] - 128) / 128
                    sum += normalized * normalized
                }
                const rms = Math.sqrt(sum / dataArray.length)
                const amplitude = Math.abs(rms) * 100

                const normalizedLevel = Math.min(amplitude / 50, 1)
                audioLevelRef.current = normalizedLevel

                if (samplesCollected < calibrationSamples) {
                    backgroundNoiseLevel = (backgroundNoiseLevel * samplesCollected + amplitude) / (samplesCollected + 1)
                    samplesCollected++
                } else {
                    const dynamicThreshold = Math.max(
                        backgroundNoiseLevel * APP_CONFIG.VAD_THRESHOLD_MULTIPLIER,
                        5
                    )

                    if (samplesCollected === calibrationSamples + 1) {
                        console.log('VAD calibrated:', { backgroundNoiseLevel, dynamicThreshold })
                    }

                    if (amplitude > dynamicThreshold) {
                        hasDetectedSpeech = true
                        if (silenceStartTimeRef.current !== null) {
                            silenceStartTimeRef.current = null
                        }
                    } else if (hasDetectedSpeech) {
                        if (silenceStartTimeRef.current === null) {
                            silenceStartTimeRef.current = Date.now()
                        } else {
                            const silenceDurationMs = Date.now() - silenceStartTimeRef.current
                            if (silenceDurationMs >= silenceDuration) {
                                console.log('Auto-stopping recording due to silence')
                                stopRecording()
                                silenceStartTimeRef.current = null
                                return
                            }
                        }
                    }
                }

                if (voiceOnlyModeRef.current && isRecordingRef.current) {
                    animationFrameRef.current = requestAnimationFrame(monitorAudio)
                }
            }

            monitorAudio()
        } catch (error) {
            console.error('Error starting audio monitoring:', error)
        }
    }, [voiceOnlyModeRef, stopRecording])

    const startRecording = useCallback(async () => {
        if (isRecordingRef.current) return

        try {
            if (typeof window === 'undefined' || typeof navigator === 'undefined') {
                showToast('Diese Funktion benötigt eine Browser-Umgebung. Bitte lade die Seite neu.', 'error', 5000)
                return
            }

            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

            let hasMediaDevices = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
            const hasWebkitGetUserMedia = typeof (navigator as any).webkitGetUserMedia === 'function'
            const hasNavigatorGetUserMedia = typeof (navigator as any).getUserMedia === 'function'
            const hasMozGetUserMedia = typeof (navigator as any).mozGetUserMedia === 'function'

            // Polyfill for Safari
            if (!hasMediaDevices && hasWebkitGetUserMedia) {
                try {
                    (navigator as any).mediaDevices = (navigator as any).mediaDevices || {}
                    if (!(navigator as any).mediaDevices.getUserMedia && hasWebkitGetUserMedia) {
                        (navigator as any).mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) =>
                            new Promise<MediaStream>((resolve, reject) => {
                                (navigator as any).webkitGetUserMedia(constraints, resolve, reject)
                            })
                    }
                } catch (e) {
                    console.error('Failed to polyfill mediaDevices:', e)
                }
            }

            hasMediaDevices = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
            const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'

            if (!hasGetUserMedia && !hasWebkitGetUserMedia && !hasNavigatorGetUserMedia && !hasMozGetUserMedia) {
                const protocol = window.location.protocol
                const hostname = window.location.hostname
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                const isAndroid = /Android/.test(navigator.userAgent)

                let errorMsg = 'Dein Browser erlaubt aktuell keinen Mikrofonzugriff.\n\n'
                const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
                if (protocol === 'http:' && !isLocalhost) {
                    errorMsg += '⚠️ Wichtig: Mikrofonzugriff funktioniert nur über HTTPS oder auf localhost.\n'
                }
                if (isIOS) {
                    errorMsg += 'Für iOS gilt:\n- Verwende Safari (ab iOS 11)\n- Nutze HTTPS oder localhost'
                } else if (isAndroid) {
                    errorMsg += 'Für Android gilt: Verwende Chrome oder Firefox und erlaube den Mikrofonzugriff.'
                } else {
                    errorMsg += 'Bitte nutze einen modernen Browser wie Chrome, Firefox oder Safari.'
                }
                showToast(errorMsg, 'error', 6000)
                return
            }

            if (!window.MediaRecorder) {
                showToast('Der MediaRecorder wird von deinem Browser nicht unterstützt. Nutze bitte Chrome, Firefox oder Safari (iOS 14.3+).', 'error', 8000)
                return
            }

            // Acquire microphone stream
            let stream: MediaStream
            if (hasGetUserMedia) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONFIG.RECORDING_OPTIONS })
            } else if (hasWebkitGetUserMedia) {
                stream = await new Promise<MediaStream>((resolve, reject) =>
                    (navigator as any).webkitGetUserMedia({ audio: true }, resolve, reject))
            } else if (hasNavigatorGetUserMedia) {
                stream = await new Promise<MediaStream>((resolve, reject) =>
                    (navigator as any).getUserMedia({ audio: true }, resolve, reject))
            } else if (hasMozGetUserMedia) {
                stream = await new Promise<MediaStream>((resolve, reject) =>
                    (navigator as any).mozGetUserMedia({ audio: true }, resolve, reject))
            } else {
                throw new Error('getUserMedia is not available')
            }

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

            let mimeType = ''
            for (const type of AUDIO_CONFIG.SUPPORTED_MIME_TYPES) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type
                    break
                }
            }
            if (!mimeType && (isIOS || isSafari)) {
                mimeType = ''
            }

            const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            audioChunksRef.current = []

            if (voiceOnlyModeRef.current) {
                startAudioMonitoring(stream)
            }

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onerror = (event: any) => {
                console.error('MediaRecorder error:', event.error)
                isRecordingRef.current = false
                notifyStateChange()
                stream.getTracks().forEach((track) => track.stop())
                showToast('Bei der Aufnahme ist ein Fehler aufgetreten. Bitte versuch es erneut.', 'error', 4000)
            }

            mediaRecorder.onstop = async () => {
                stopAudioMonitoring()
                stream.getTracks().forEach((track) => track.stop())
                streamRef.current = null

                if (audioChunksRef.current.length === 0) {
                    isRecordingRef.current = false
                    notifyStateChange()
                    if (!voiceOnlyModeRef.current) {
                        showToast('Es wurde kein Audio aufgezeichnet. Bitte versuch es erneut.', 'warning', 4000)
                    }
                    if (voiceOnlyModeRef.current) {
                        setTimeout(() => {
                            if (voiceOnlyModeRef.current && !isRecordingRef.current) startRecording()
                        }, 500)
                    }
                    return
                }

                const actualMimeType = mediaRecorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm'
                const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType })

                if (!isValidAudioBlob(audioBlob)) {
                    isRecordingRef.current = false
                    notifyStateChange()
                    if (!voiceOnlyModeRef.current) {
                        showToast('Die Aufnahme war zu kurz. Bitte versuch es erneut.', 'warning', 4000)
                    }
                    if (voiceOnlyModeRef.current) {
                        setTimeout(() => {
                            if (voiceOnlyModeRef.current && !isRecordingRef.current) startRecording()
                        }, 500)
                    }
                    return
                }

                const fileExtension = getFileExtensionFromMimeType(actualMimeType)

                try {
                    isProcessingVoiceRef.current = true
                    isProcessingSTTRef.current = true
                    notifyStateChange()

                    const formData = new FormData()
                    formData.append('audio', audioBlob, `recording.${fileExtension}`)

                    let sttResponse: Response | null = null
                    let sttError: Error | null = null

                    for (let attempt = 0; attempt < APP_CONFIG.STT_MAX_ATTEMPTS; attempt++) {
                        try {
                            const authHeaders = await getAuthHeaders()
                            const candidate = await fetch('/api/stt', {
                                method: 'POST',
                                headers: { ...authHeaders },
                                body: formData,
                            })
                            if (candidate.ok) {
                                sttResponse = candidate
                                break
                            } else {
                                const errorData = await candidate.json().catch(() => ({}))
                                sttError = new Error(errorData.error || `STT-Fehler (${candidate.status})`)
                            }
                        } catch (err) {
                            sttError = err instanceof Error ? err : new Error('Unbekannter STT-Fehler')
                        }
                        if (attempt < APP_CONFIG.STT_MAX_ATTEMPTS - 1) {
                            await delay(APP_CONFIG.STT_RETRY_DELAY_MS)
                        }
                    }

                    if (!sttResponse) {
                        throw (sttError || new Error('Die Spracherkennung ist fehlgeschlagen.'))
                    }

                    const data = await sttResponse.json()
                    if (data.transcript) {
                        if (voiceOnlyModeRef.current) {
                            await onVoiceOnlyTranscript(data.transcript)
                        } else {
                            onTranscript(data.transcript)
                        }
                    } else {
                        if (!voiceOnlyModeRef.current) {
                            showToast('Es wurde keine Sprache erkannt. Bitte sprich noch einmal.', 'warning', 4000)
                        }
                        if (voiceOnlyModeRef.current) {
                            setTimeout(() => {
                                if (voiceOnlyModeRef.current && !isRecordingRef.current) startRecording()
                            }, 500)
                        }
                    }
                } catch (error) {
                    console.error('STT error:', error)
                    let errorMsg = 'Die Spracherkennung ist fehlgeschlagen. '
                    if (error instanceof Error) errorMsg += error.message
                    else errorMsg += 'Unbekannter Fehler'

                    if (isMobile) {
                        errorMsg += '\n\nAuf mobilen Geräten gilt:\n- Stelle eine stabile Internetverbindung sicher\n- Die Aufnahme sollte klar und nicht zu kurz sein'
                    }
                    showToast(errorMsg, 'error', 6000)

                    if (voiceOnlyModeRef.current) {
                        setTimeout(() => {
                            if (voiceOnlyModeRef.current && !isRecordingRef.current) startRecording()
                        }, 1000)
                    }
                } finally {
                    isRecordingRef.current = false
                    isProcessingVoiceRef.current = false
                    isProcessingSTTRef.current = false
                    notifyStateChange()
                }
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start(APP_CONFIG.AUDIO_CHUNK_SIZE_MS)
            triggerHaptic('heavy')
            isRecordingRef.current = true
            notifyStateChange()
        } catch (error: any) {
            console.error('Error accessing microphone:', error)
            isRecordingRef.current = false
            notifyStateChange()
            const errorMessage = error instanceof Error
                ? getMicrophoneErrorMessage(error)
                : ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED
            showToast(errorMessage, 'error', 6000)
        }
    }, [getAuthHeaders, voiceOnlyModeRef, onVoiceOnlyTranscript, onTranscript, startAudioMonitoring, stopAudioMonitoring, notifyStateChange])

    return {
        // Expose state via refs — the parent component will manage React state
        get isRecording() { return isRecordingRef.current },
        get isProcessingSTT() { return isProcessingSTTRef.current },
        get isProcessingVoice() { return isProcessingVoiceRef.current },
        get audioLevel() { return audioLevelRef.current },
        get silenceStartTime() { return silenceStartTimeRef.current },
        startRecording,
        stopRecording,
        startAudioMonitoring,
        stopAudioMonitoring,
        mediaRecorderRef,
        audioChunksRef,
        audioContextRef,
        analyserRef,
        streamRef,
    }
}
