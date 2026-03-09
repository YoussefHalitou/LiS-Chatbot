'use client'

import { useState, useRef, useCallback } from 'react'

interface UseVoiceModeOptions {
    startRecording: () => Promise<void>
    stopRecording: () => void
    stopSpeaking: () => void
    stopAudioMonitoring: () => void
    unlockAudioForIOS: () => void
}

interface UseVoiceModeReturn {
    voiceOnlyMode: boolean
    voiceOnlyModeRef: React.MutableRefObject<boolean>
    enterVoiceOnlyMode: () => Promise<void>
    exitVoiceOnlyMode: () => void
}

export function useVoiceMode({
    startRecording,
    stopRecording,
    stopSpeaking,
    stopAudioMonitoring,
    unlockAudioForIOS,
}: UseVoiceModeOptions): UseVoiceModeReturn {
    const [voiceOnlyMode, setVoiceOnlyMode] = useState(false)
    const voiceOnlyModeRef = useRef(false)

    const enterVoiceOnlyMode = useCallback(async () => {
        console.log('[Voice Mode] Entering voice-only mode')
        unlockAudioForIOS()
        setVoiceOnlyMode(true)
        voiceOnlyModeRef.current = true
        await startRecording()
    }, [startRecording, unlockAudioForIOS])

    const exitVoiceOnlyMode = useCallback(() => {
        console.log('[Voice Mode] Exiting voice-only mode')
        setVoiceOnlyMode(false)
        voiceOnlyModeRef.current = false
        stopRecording()
        stopSpeaking()
        stopAudioMonitoring()
    }, [stopRecording, stopSpeaking, stopAudioMonitoring])

    return {
        voiceOnlyMode,
        voiceOnlyModeRef,
        enterVoiceOnlyMode,
        exitVoiceOnlyMode,
    }
}
