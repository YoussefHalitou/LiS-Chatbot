'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Mic, MicOff, Volume2, Send, Loader2, Copy, Check, Trash2, X, MessageSquare, Plus, Menu } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message, Chat } from '@/types'
import { APP_CONFIG, AUDIO_CONFIG, ERROR_MESSAGES, UI_CONFIG } from '@/lib/constants'
import {
  getAllChats,
  getChatMessages,
  saveChatMessages,
  createNewChat,
  deleteChat,
  getCurrentChatId,
  setCurrentChatId,
} from '@/lib/chat-management-supabase'
import { migrateOldChatFormat } from '@/lib/chat-management'
import {
  delay,
  formatTextForSpeech,
  formatTimestamp,
  isValidAudioBlob,
  getFileExtensionFromMimeType,
  getMicrophoneErrorMessage,
  sanitizeInput,
} from '@/lib/utils'
import ConnectionStatus from '@/components/ConnectionStatus'
import { showToast } from '@/lib/toast'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [isStreamingResponse, setIsStreamingResponse] = useState(false)
  const [showLoadingBubble, setShowLoadingBubble] = useState(false)
  const [isQueryingDatabase, setIsQueryingDatabase] = useState(false)
  const [isProcessingSTT, setIsProcessingSTT] = useState(false)
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [silenceStartTime, setSilenceStartTime] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamTimeoutRef = useRef<number | null>(null)
  const loadingBubbleTimeoutRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const silenceStartTimeRef = useRef<number | null>(null)
  const voiceOnlyModeRef = useRef<boolean>(false) // Use ref to track voice-only mode reliably
  const streamingDisabled = useMemo(
    () =>
      process.env.NEXT_PUBLIC_DISABLE_STREAMING === 'true' ||
      process.env.CHAT_STREAMING_DISABLED === 'true',
    []
  )

  // Initialize chats on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    async function loadChats() {
      // Migrate old format if needed (localStorage only)
      migrateOldChatFormat()
      
      // Load chat list (Supabase if authenticated, localStorage otherwise)
      const loadedChats = await getAllChats()
      setChats(loadedChats)
      
      // Load current chat
      const currentId = getCurrentChatId()
      if (currentId) {
        const chatExists = loadedChats.some(c => c.id === currentId)
        if (chatExists) {
          setCurrentChatId(currentId)
          const chatMessages = await getChatMessages(currentId)
          setMessages(chatMessages)
        } else {
          // Current chat doesn't exist, create new one
          const newChat = await createNewChat()
          setCurrentChatId(newChat.id)
          setChats([newChat, ...loadedChats])
          setMessages([])
        }
      } else if (loadedChats.length > 0) {
        // No current chat, use first one
        const firstChat = loadedChats[0]
        setCurrentChatId(firstChat.id)
        const chatMessages = await getChatMessages(firstChat.id)
        setMessages(chatMessages)
      } else {
        // No chats exist, create new one
        const newChat = await createNewChat()
        setCurrentChatId(newChat.id)
        setChats([newChat])
        setMessages([])
      }
    }
    
    loadChats()
  }, [])

  // Save chat messages whenever they change
  useEffect(() => {
    if (typeof window === 'undefined' || !currentChatId) return
    
    async function saveMessages() {
      if (messages.length > 0) {
        await saveChatMessages(currentChatId, messages)
        // Update chat list to reflect changes
        const updatedChats = await getAllChats()
        setChats(updatedChats)
      }
    }
    
    saveMessages()
  }, [messages, currentChatId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const startRecording = async () => {
    if (isRecording) return

    try {
      // Check if we're in the browser (not SSR)
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        showToast('Diese Funktion benötigt eine Browser-Umgebung. Bitte lade die Seite neu.', 'error', 5000)
        return
      }

      // Check for getUserMedia support with fallbacks
      // Safari on macOS might need special handling
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      
      // Check what's actually available
      const hasMediaDevices = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
      const hasMediaDevicesGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
      const hasWebkitGetUserMedia = typeof (navigator as any).webkitGetUserMedia === 'function'
      const hasNavigatorGetUserMedia = typeof (navigator as any).getUserMedia === 'function'
      const hasMozGetUserMedia = typeof (navigator as any).mozGetUserMedia === 'function'
      
      // If mediaDevices is undefined, try to polyfill it for Safari
      if (!hasMediaDevices && hasWebkitGetUserMedia) {
        // Safari might need a polyfill - try to create mediaDevices
        try {
          (navigator as any).mediaDevices = (navigator as any).mediaDevices || {}
          if (!(navigator as any).mediaDevices.getUserMedia && hasWebkitGetUserMedia) {
            (navigator as any).mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) => {
              return new Promise<MediaStream>((resolve, reject) => {
                (navigator as any).webkitGetUserMedia(
                  constraints,
                  resolve,
                  reject
                )
              })
            }
            // Update the check
            const hasPolyfilled = typeof (navigator as any).mediaDevices.getUserMedia === 'function'
            if (hasPolyfilled) {
              console.log('Polyfilled navigator.mediaDevices.getUserMedia for Safari')
            }
          }
        } catch (e) {
          console.error('Failed to polyfill mediaDevices:', e)
        }
      }
      
      // Re-check after potential polyfill
      const hasMediaDevicesAfterPolyfill = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
      const hasMediaDevicesGetUserMediaAfterPolyfill = hasMediaDevicesAfterPolyfill && typeof navigator.mediaDevices.getUserMedia === 'function'
      
      if (!hasMediaDevicesGetUserMediaAfterPolyfill && !hasWebkitGetUserMedia && !hasNavigatorGetUserMedia && !hasMozGetUserMedia) {
        const userAgent = navigator.userAgent
        const isIOS = /iPad|iPhone|iPod/.test(userAgent)
        const isAndroid = /Android/.test(userAgent)
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
        const isSecure = protocol === 'https:' || isLocalhost
        
        // Detailed debugging
        const debugInfo = {
          hasMediaDevices: !!navigator.mediaDevices,
          hasMediaDevicesGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          hasNavigatorGetUserMedia: !!(navigator as any).getUserMedia,
          hasWebkitGetUserMedia: !!(navigator as any).webkitGetUserMedia,
          hasMozGetUserMedia: !!(navigator as any).mozGetUserMedia,
          protocol,
          hostname,
          isLocalhost,
          isSecure,
          userAgent,
          navigatorKeys: Object.keys(navigator).filter(key => key.toLowerCase().includes('media') || key.toLowerCase().includes('user')),
        }
        console.error('getUserMedia not available:', debugInfo)
        console.error('Full navigator.mediaDevices:', navigator.mediaDevices)
        console.error('navigator.mediaDevices type:', typeof navigator.mediaDevices)
        
        let errorMsg = 'Dein Browser erlaubt aktuell keinen Mikrofonzugriff.\n\n'
        
        // Only warn about HTTPS if it's not localhost
        if (!isSecure && !isLocalhost && protocol === 'http:') {
          errorMsg += '⚠️ Wichtig: Mikrofonzugriff funktioniert nur über HTTPS oder auf localhost.\n'
          errorMsg += `Aktuell: ${protocol}//${hostname}\n\n`
        }
        
        if (isIOS) {
          errorMsg += 'Für iOS gilt:\n- Verwende Safari (ab iOS 11)\n- Nutze HTTPS oder localhost\n- Prüfe in Safari unter Einstellungen → Websites → Mikrofon'
        } else if (isAndroid) {
          errorMsg += 'Für Android gilt: Verwende Chrome oder Firefox und erlaube den Mikrofonzugriff.'
        } else {
          errorMsg += 'Bitte nutze einen modernen Browser wie Chrome, Firefox oder Safari.\n\n'
          errorMsg += 'Falls du Safari verwendest:\n- Stelle sicher, dass du Safari 11+ nutzt\n- Aktiviere die Mikrofonberechtigung in den Safari-Einstellungen'
        }
        errorMsg += `\n\nBrowser: ${userAgent}\nProtokoll: ${protocol}\nHostname: ${hostname}`
        showToast(errorMsg, 'error', 6000)
        return
      }

      // Check if MediaRecorder is available
      if (!window.MediaRecorder) {
        const userAgent = navigator.userAgent
        showToast(`Der MediaRecorder wird von deinem Browser nicht unterstützt. Nutze bitte Chrome, Firefox oder Safari (iOS 14.3+). Aktueller Browser: ${userAgent}`, 'error', 8000)
        return
      }

      // Request microphone access
      // Use the standard API directly - it should work in Safari 11+
      let stream: MediaStream
      
      // Re-check after potential polyfill
      const finalHasMediaDevices = navigator.mediaDevices !== undefined && navigator.mediaDevices !== null
      const finalHasMediaDevicesGetUserMedia = finalHasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
      
      if (finalHasMediaDevicesGetUserMedia) {
        // Modern standard API (Chrome, Firefox, Safari 11+)
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: AUDIO_CONFIG.RECORDING_OPTIONS
        })
      } else if (hasWebkitGetUserMedia) {
        // Safari fallback (older Safari)
        stream = await new Promise<MediaStream>((resolve, reject) => {
          (navigator as any).webkitGetUserMedia(
            { audio: true },
            resolve,
            reject
          )
        })
      } else if (hasNavigatorGetUserMedia) {
        // Other fallback
        stream = await new Promise<MediaStream>((resolve, reject) => {
          (navigator as any).getUserMedia(
            { audio: true },
            resolve,
            reject
          )
        })
      } else if (hasMozGetUserMedia) {
        // Firefox fallback
        stream = await new Promise<MediaStream>((resolve, reject) => {
          (navigator as any).mozGetUserMedia(
            { audio: true },
            resolve,
            reject
          )
        })
      } else {
        throw new Error('getUserMedia is not available')
      }

      // Detect mobile device
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      // Try to find a supported MIME type (prioritize formats that work on mobile)
      let mimeType = ''
      for (const type of AUDIO_CONFIG.SUPPORTED_MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }

      // For iOS/Safari, use browser default if no specific type is supported
      if (!mimeType && (isIOS || isSafari)) {
        mimeType = '' // Let browser choose
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      audioChunksRef.current = []
      
      // Start audio monitoring for voice-only mode
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
        setIsRecording(false)
        stream.getTracks().forEach((track) => track.stop())
        showToast('Bei der Aufnahme ist ein Fehler aufgetreten. Bitte versuch es erneut.', 'error', 4000)
      }

      mediaRecorder.onstop = async () => {
        // Stop audio monitoring
        stopAudioMonitoring()
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        console.log('[STT] MediaRecorder stopped, chunks collected:', audioChunksRef.current.length)

        if (audioChunksRef.current.length === 0) {
          console.warn('[STT] No audio chunks recorded')
          setIsRecording(false)
          if (!voiceOnlyModeRef.current) {
            showToast('Es wurde kein Audio aufgezeichnet. Bitte versuch es erneut.', 'warning', 4000)
          }
          // In voice-only mode, restart recording if no audio was captured
          if (voiceOnlyModeRef.current) {
            setTimeout(() => {
              if (voiceOnlyModeRef.current && !isRecording) {
                startRecording()
              }
            }, 500)
          }
          return
        }

        // Create audio blob and send to STT API
        const actualMimeType = mediaRecorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        })

        console.log('[STT] Audio blob created:', { 
          size: audioBlob.size, 
          type: actualMimeType,
          chunks: audioChunksRef.current.length 
        })

        // Check if blob is too small (likely no actual audio)
        if (!isValidAudioBlob(audioBlob)) {
          console.warn('[STT] Audio blob too small, likely no audio captured')
          setIsRecording(false)
          if (!voiceOnlyModeRef.current) {
            showToast('Die Aufnahme war zu kurz. Bitte versuch es erneut.', 'warning', 4000)
          }
          if (voiceOnlyModeRef.current) {
            setTimeout(() => {
              if (voiceOnlyModeRef.current && !isRecording) {
                startRecording()
              }
            }, 500)
          }
          return
        }

        // Determine file extension based on MIME type
        const fileExtension = getFileExtensionFromMimeType(actualMimeType)

        try {
          setIsProcessingVoice(true)
          setIsProcessingSTT(true)
          const formData = new FormData()
          formData.append('audio', audioBlob, `recording.${fileExtension}`)

          let sttResponse: Response | null = null
          let sttError: Error | null = null

          for (let attempt = 0; attempt < APP_CONFIG.STT_MAX_ATTEMPTS; attempt++) {
            try {
              const candidate = await fetch('/api/stt', {
                method: 'POST',
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
            // In voice-only mode, automatically send the message and get response
            if (voiceOnlyModeRef.current) {
              await handleVoiceOnlyMessage(data.transcript)
            } else {
              // Normal mode: just set the input
              setInput(data.transcript)
            }
          } else {
            if (!voiceOnlyModeRef.current) {
              showToast('Es wurde keine Sprache erkannt. Bitte sprich noch einmal.', 'warning', 4000)
            }
            // In voice-only mode, restart recording
            if (voiceOnlyModeRef.current) {
              setTimeout(() => {
                if (voiceOnlyModeRef.current && !isRecording) {
                  startRecording()
                }
              }, 500)
            }
          }
        } catch (error) {
          console.error('STT error:', error)
          console.error('Audio blob size:', audioBlob.size, 'Type:', actualMimeType)
          
          let errorMsg = 'Die Spracherkennung ist fehlgeschlagen. '
          if (error instanceof Error) {
            errorMsg += error.message
          } else {
            errorMsg += 'Unbekannter Fehler'
          }
          
          // Provide helpful mobile-specific error messages
          if (isMobile) {
            errorMsg += '\n\nAuf mobilen Geräten gilt:\n- Stelle eine stabile Internetverbindung sicher\n- Die Aufnahme sollte klar und nicht zu kurz sein\n- Sprich lauter oder näher am Mikrofon'
          }
          
          showToast(errorMsg, 'error', 6000)
          
          // In voice-only mode, restart recording after error
          if (voiceOnlyModeRef.current) {
            setTimeout(() => {
              if (voiceOnlyModeRef.current && !isRecording) {
                startRecording()
              }
            }, 1000)
          }
        } finally {
          setIsRecording(false)
          setIsProcessingVoice(false)
          setIsProcessingSTT(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      
      // Always use timeslices to ensure data is captured reliably
      // This prevents the "first recording fails" issue where ondataavailable
      // doesn't fire if recording is stopped too quickly
      console.log(`[STT] Starting MediaRecorder with ${APP_CONFIG.AUDIO_CHUNK_SIZE_MS}ms timeslices`)
      mediaRecorder.start(APP_CONFIG.AUDIO_CHUNK_SIZE_MS)
      
      setIsRecording(true)
    } catch (error: any) {
      console.error('Error accessing microphone:', error)
      setIsRecording(false)
      
      const errorMessage = error instanceof Error 
        ? getMicrophoneErrorMessage(error)
        : ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED
      
      showToast(errorMessage, 'error', 6000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      // setIsRecording will be set to false in onstop handler
    }
  }


  const speakText = async (text: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlayingAudio(false)
    }

    let audioUrl: string | null = null
    let fallbackTimeout: number | null = null

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

      utterance.onend = () => {
        setIsPlayingAudio(false)
        setIsGeneratingTTS(false)
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
        setIsGeneratingTTS(false)
      }

      window.speechSynthesis.speak(utterance)
    }

    try {
      setIsGeneratingTTS(true)
      const preparedText = formatTextForSpeech(text)
      const ttsStartTime = Date.now()
      
      console.log('[TTS] Starting TTS for text length:', preparedText.length)

      let ttsResponse: Response | null = null
      let ttsError: Error | null = null

      for (let attempt = 0; attempt < APP_CONFIG.TTS_MAX_ATTEMPTS; attempt++) {
        try {
          const candidate = await fetch('/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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

      // Convert response to blob URL
      const audioBlob = await ttsResponse.blob()
      audioUrl = URL.createObjectURL(audioBlob)

      console.log('[TTS] Audio blob received, size:', audioBlob.size)

      // Create audio element immediately and start loading
      const audio = new Audio()
      audioRef.current = audio
      
      // Store URL for cleanup
      const urlToCleanup = audioUrl
      
      // Set state BEFORE setting up handlers to ensure button is visible immediately
      setIsPlayingAudio(true)
      setIsGeneratingTTS(false) // TTS generation is complete, now playing
      
      // Set up event handlers before setting source
      audio.onplay = () => {
        console.log('[TTS] Audio onplay event fired')
        if (fallbackTimeout) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }
        const playbackDelayMs = Date.now() - ttsStartTime
        if (playbackDelayMs > APP_CONFIG.TTS_FALLBACK_DELAY_MS) {
          audio.playbackRate = APP_CONFIG.TTS_SLOW_RATE
        }
        setIsPlayingAudio(true) // Ensure it's still true
      }
      
      audio.onended = () => {
        console.log('[TTS] Audio onended event fired')
        setIsPlayingAudio(false)
        audioRef.current = null
        if (urlToCleanup) {
          URL.revokeObjectURL(urlToCleanup)
        }
        if (fallbackTimeout) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }
        
        // In voice-only mode, restart recording after audio finishes
        // Use ref to get current state reliably
        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
          console.log('[TTS] Restarting recording after audio ended')
          setTimeout(() => {
            if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
              startRecording()
            }
          }, 500)
        }
      }
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e, {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src
        })
        setIsPlayingAudio(false)
        setIsGeneratingTTS(false)
        audioRef.current = null
        if (urlToCleanup) {
          URL.revokeObjectURL(urlToCleanup)
        }
        if (fallbackTimeout) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = null
        }
        // Don't show alert in voice-only mode to avoid interrupting flow
        if (!voiceOnlyMode) {
          showToast('Audio konnte nicht abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
        }
      }
      
      // Set source and preload
      audio.src = audioUrl
      audio.preload = 'auto'
      // Ensure consistent playback speed (1.0 = normal speed)
      audio.playbackRate = 1.0
      
      console.log('[TTS] Audio element created, attempting to play...', {
        readyState: audio.readyState,
        src: audioUrl.substring(0, 50) + '...'
      })
      
      // Simplified playback logic - just try to play, with one retry on failure
      let playAttempted = false
      
      const attemptPlay = async () => {
        if (playAttempted) {
          console.log('[TTS] Play already attempted, skipping duplicate')
          return
        }
        playAttempted = true
        
        console.log('[TTS] Attempting to play audio...', { readyState: audio.readyState })
        
        try {
          await audio.play()
          console.log('[TTS] Audio playing successfully')
        } catch (playError: any) {
          console.error('[TTS] Play error:', playError)
          
          // Handle play errors gracefully
          if (playError.name === 'NotAllowedError') {
            console.error('[TTS] Audio play blocked by browser autoplay policy')
            setIsPlayingAudio(false)
            audioRef.current = null
            if (urlToCleanup) {
              URL.revokeObjectURL(urlToCleanup)
            }
            if (fallbackTimeout) {
              window.clearTimeout(fallbackTimeout)
              fallbackTimeout = null
            }
            try {
              speakWithWebSpeech(preparedText)
            } catch (fallbackError) {
              console.error('[TTS] Web Speech fallback failed:', fallbackError)
            }
            setIsGeneratingTTS(false)
            if (!voiceOnlyMode) {
              showToast('Die Audiowiedergabe wurde vom Browser blockiert. Bitte interagiere zuerst mit der Seite (z.B. ein Klick).', 'warning', 5000)
            }
          } else {
            // For other errors, wait a bit and try once more
            console.log('[TTS] Retrying playback after brief delay...')
            setTimeout(async () => {
              try {
                await audio.play()
                console.log('[TTS] Audio playing successfully after retry')
              } catch (retryError) {
                console.error('[TTS] Audio play retry failed:', retryError)
                setIsPlayingAudio(false)
                audioRef.current = null
                if (urlToCleanup) {
                  URL.revokeObjectURL(urlToCleanup)
                }
                if (!voiceOnlyMode) {
                  showToast('Audio konnte nicht abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
                }
              }
            }, 200)
          }
        }
      }
      
      // Try to play as soon as enough data is loaded
      if (audio.readyState >= 3) {
        // HAVE_FUTURE_DATA or higher - enough to start playing
        attemptPlay()
      } else {
        // Wait for canplay event (HAVE_FUTURE_DATA)
        audio.addEventListener('canplay', attemptPlay, { once: true })
      }

      fallbackTimeout = window.setTimeout(() => {
        console.warn('[TTS] Playback delay exceeded, falling back to Web Speech API')
        try {
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            audioRef.current = null
          }
          if (urlToCleanup) {
            URL.revokeObjectURL(urlToCleanup)
          }
          speakWithWebSpeech(preparedText)
        } catch (fallbackError) {
          console.error('[TTS] Web Speech fallback failed:', fallbackError)
        }
      }, APP_CONFIG.TTS_FALLBACK_DELAY_MS)
    } catch (error) {
      console.error('TTS error:', error)
      setIsPlayingAudio(false)
      setIsGeneratingTTS(false)
      if (fallbackTimeout) {
        window.clearTimeout(fallbackTimeout)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (audioRef.current) {
        audioRef.current = null
      }
      try {
        speakWithWebSpeech(formatTextForSpeech(text))
      } catch (fallbackError) {
        console.error('[TTS] Web Speech fallback failed:', fallbackError)
      }
      // Don't show alert in voice-only mode
      if (!voiceOnlyMode) {
        showToast('Audio konnte nicht erzeugt oder abgespielt werden. Bitte versuch es erneut.', 'error', 4000)
      }
    }
  }

  const stopSpeaking = () => {
    console.log('[TTS] Stop speaking requested', { 
      hasAudio: !!audioRef.current, 
      isPlayingAudio,
      voiceOnlyMode: voiceOnlyModeRef.current 
    })
    
    // Always clean up audio, even if ref is null
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0 // Reset to start
      } catch (e) {
        console.warn('[TTS] Error pausing audio:', e)
      }
      audioRef.current = null
    }
    
    // Always set state to false, even if audio was already gone
    setIsPlayingAudio(false)
    
    // In voice-only mode, restart recording after interrupting
    if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
      console.log('[TTS] Restarting recording after interrupt')
      setTimeout(() => {
        if (voiceOnlyModeRef.current && !isRecording && !isLoading) {
          startRecording()
        }
      }, 300)
    }
  }

  // Voice Activity Detection - monitor audio levels
  const startAudioMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 2048 // Larger FFT for better time domain analysis
      analyser.smoothingTimeConstant = 0.3 // Less smoothing for more responsive detection
      microphone.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      streamRef.current = stream
      silenceStartTimeRef.current = null // Reset silence timer
      
      const dataArray = new Uint8Array(analyser.fftSize)
      const silenceDuration = APP_CONFIG.SILENCE_DURATION_MS
      
      // Dynamic threshold: measure background noise first
      let backgroundNoiseLevel = 0
      let samplesCollected = 0
      const calibrationSamples = APP_CONFIG.VAD_CALIBRATION_SAMPLES
      let hasDetectedSpeech = false // Track if we've detected any speech
      
      const monitorAudio = () => {
        if (!analyserRef.current || !voiceOnlyModeRef.current || !isRecording) {
          return
        }
        
        // Use getByteTimeDomainData for amplitude-based VAD (better for speech detection)
        analyserRef.current.getByteTimeDomainData(dataArray)
        
        // Calculate RMS (Root Mean Square) for better amplitude detection
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128 // Normalize to -1 to 1
          sum += normalized * normalized
        }
        const rms = Math.sqrt(sum / dataArray.length)
        const amplitude = Math.abs(rms) * 100 // Convert to 0-100 scale
        
        // Normalize for visualization (0-1)
        const normalizedLevel = Math.min(amplitude / 50, 1)
        setAudioLevel(normalizedLevel)
        
        // Calibrate background noise level during first few samples
        if (samplesCollected < calibrationSamples) {
          backgroundNoiseLevel = (backgroundNoiseLevel * samplesCollected + amplitude) / (samplesCollected + 1)
          samplesCollected++
        } else {
          // After calibration, use dynamic threshold (background noise + margin)
          const dynamicThreshold = Math.max(
            backgroundNoiseLevel * APP_CONFIG.VAD_THRESHOLD_MULTIPLIER,
            5
          ) // At least 5, or threshold multiplier x background
          
          // Debug logging (can be removed later)
          if (samplesCollected === calibrationSamples + 1) {
            console.log('VAD calibrated:', { backgroundNoiseLevel, dynamicThreshold })
          }
          
          // Detect if speech is present (amplitude significantly above background)
          if (amplitude > dynamicThreshold) {
            hasDetectedSpeech = true
            // Reset silence timer if audio detected
            if (silenceStartTimeRef.current !== null) {
              silenceStartTimeRef.current = null
              setSilenceStartTime(null)
            }
          } else if (hasDetectedSpeech) {
            // Only start silence timer if we've detected speech before
            // This prevents auto-stop before user even speaks
            if (silenceStartTimeRef.current === null) {
              silenceStartTimeRef.current = Date.now()
              setSilenceStartTime(silenceStartTimeRef.current)
            } else {
              const silenceDurationMs = Date.now() - silenceStartTimeRef.current
              if (silenceDurationMs >= silenceDuration) {
                // Auto-stop after silence
                console.log('Auto-stopping recording due to silence', {
                  amplitude,
                  threshold: dynamicThreshold,
                  backgroundNoise: backgroundNoiseLevel,
                  silenceDuration: silenceDurationMs
                })
                stopRecording()
                silenceStartTimeRef.current = null
                setSilenceStartTime(null)
                return // Exit monitoring
              }
            }
          }
        }
        
        // Continue monitoring
        if (voiceOnlyModeRef.current && isRecording) {
          animationFrameRef.current = requestAnimationFrame(monitorAudio)
        }
      }
      
      monitorAudio()
    } catch (error) {
      console.error('Error starting audio monitoring:', error)
    }
  }

  const stopAudioMonitoring = () => {
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
    setAudioLevel(0)
    setSilenceStartTime(null)
  }

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), UI_CONFIG.COPY_FEEDBACK_DURATION_MS)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  const clearChat = useCallback(async () => {
    if (confirm('Möchtest du den gesamten Chatverlauf wirklich löschen?')) {
      setMessages([])
      if (currentChatId) {
        await saveChatMessages(currentChatId, [])
        const updatedChats = await getAllChats()
        setChats(updatedChats)
      }
      showToast('Chatverlauf wurde gelöscht', 'success', 3000)
    }
  }, [currentChatId])

  // Chat management functions
  const handleNewChat = async () => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      await saveChatMessages(currentChatId, messages)
    }
    
    const newChat = await createNewChat()
    setCurrentChatId(newChat.id)
    const updatedChats = await getAllChats()
    setChats(updatedChats)
    setMessages([])
    setShowChatSidebar(false)
  }

  const handleSwitchChat = async (chatId: string) => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      await saveChatMessages(currentChatId, messages)
    }
    
    setCurrentChatId(chatId)
    const chatMessages = await getChatMessages(chatId)
    setMessages(chatMessages)
    const updatedChats = await getAllChats()
    setChats(updatedChats)
    setShowChatSidebar(false)
  }

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Möchtest du diesen Chat wirklich löschen?')) {
      await deleteChat(chatId)
      const updatedChats = await getAllChats()
      setChats(updatedChats)
      
      // If deleted chat was current, switch to another
      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          await handleSwitchChat(updatedChats[0].id)
        } else {
          await handleNewChat()
        }
      }
    }
  }

  const clearStreamTimeout = () => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current)
      streamTimeoutRef.current = null
    }
  }

  const clearLoadingBubbleTimeout = () => {
    if (loadingBubbleTimeoutRef.current) {
      clearTimeout(loadingBubbleTimeoutRef.current)
      loadingBubbleTimeoutRef.current = null
    }
  }

  const cancelStreaming = (message?: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    clearStreamTimeout()
    clearLoadingBubbleTimeout()
    setShowLoadingBubble(false)

    if (message) {
      const timestamp = new Date()
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: message,
          timestamp,
        },
      ])
    }
  }

  const readSseStream = async (
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
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === assistantIndex
                  ? { ...msg, content: (msg.content || '') + payload.content, timestamp: assistantTimestamp }
                  : msg
              )
            )
          } else if (payload.type === 'tool_calls' && payload.tool_calls) {
            // Preserve tool calls in the message
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === assistantIndex
                  ? { ...msg, tool_calls: payload.tool_calls, timestamp: assistantTimestamp }
                  : msg
              )
            )
          } else if (payload.type === 'tool_response' && payload.tool_call_id) {
            // Preserve tool response messages
            setMessages((prev) => [
              ...prev,
              {
                role: 'tool',
                content: payload.content,
                tool_call_id: payload.tool_call_id,
                timestamp: new Date(),
              },
            ])
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
  }

  const startChatRequest = async (
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        setMessages((prev) =>
          prev.map((msg, idx) =>
            idx === assistantIndex
              ? {
                  ...msg,
                  content: data.message?.content || 'Antwort konnte nicht geladen werden.',
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
  }

  const sendMessage = useCallback(async () => {
    const sanitizedInput = sanitizeInput(input)
    if (!sanitizedInput || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: sanitizedInput,
      timestamp: new Date(),
    }

    setInput('')
    await startChatRequest(userMessage)
  }, [input, isLoading, startChatRequest])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus input field
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        textareaRef.current?.focus()
      }

      // Esc: Cancel recording or exit voice-only mode
      if (e.key === 'Escape') {
        if (isRecording) {
          stopRecording()
          showToast('Aufnahme abgebrochen', 'info', 2000)
        }
        if (voiceOnlyMode) {
          exitVoiceOnlyMode()
        }
        // Cancel ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }

      // Ctrl/Cmd + Enter: Send message (alternative to Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isLoading && input.trim()) {
          sendMessage()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [isRecording, voiceOnlyMode, isLoading, input, sendMessage])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        UI_CONFIG.TEXTAREA_MAX_HEIGHT
      )}px`
    }
  }, [input])

  const handleVoiceOnlyMessage = async (transcript: string) => {
    const userMessage: Message = {
      role: 'user',
      content: transcript,
      timestamp: new Date(),
    }

    await startChatRequest(userMessage, { speakResponse: true })
  }

  const enterVoiceOnlyMode = async () => {
    console.log('[Voice Mode] Entering voice-only mode')
    setVoiceOnlyMode(true)
    voiceOnlyModeRef.current = true // Sync ref immediately
    // Start recording immediately
    await startRecording()
  }

  const exitVoiceOnlyMode = () => {
    console.log('[Voice Mode] Exiting voice-only mode')
    setVoiceOnlyMode(false)
    voiceOnlyModeRef.current = false // Sync ref immediately - this stops the loop
    stopRecording()
    stopSpeaking()
    stopAudioMonitoring()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioMonitoring()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const playLastResponse = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant')

    if (lastAssistantMessage) {
      speakText(lastAssistantMessage.content)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white safe-area-inset relative">
      {/* Chat Sidebar */}
      {showChatSidebar && (
        <div className="fixed inset-0 z-50 flex sm:relative sm:z-auto">
          {/* Overlay for mobile */}
          <div 
            className="fixed inset-0 bg-black/50 sm:hidden"
            onClick={() => setShowChatSidebar(false)}
          />
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full z-50 sm:z-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
              <button
                onClick={handleNewChat}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Neuer Chat"
              >
                <Plus className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>Noch keine Chats</p>
                  <button
                    onClick={handleNewChat}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ersten Chat erstellen
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleSwitchChat(chat.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 group ${
                        chat.id === currentChatId
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            chat.id === currentChatId ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {chat.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {chat.messageCount} Nachrichten • {new Date(chat.updatedAt).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-600 transition-all"
                          title="Chat löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Header - Mobile optimized */}
      <div className={`${voiceOnlyMode ? 'bg-blue-600' : 'bg-white'} border-b ${voiceOnlyMode ? 'border-blue-700' : 'border-gray-100'} px-3 py-3 sm:px-4 sm:py-3 sticky top-0 z-10 safe-area-inset-top transition-colors`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg ${voiceOnlyMode ? 'bg-white' : 'bg-gradient-to-br from-blue-500 to-blue-600'} flex items-center justify-center shadow-sm flex-shrink-0`}>
                <span className={`font-bold text-sm sm:text-base ${voiceOnlyMode ? 'text-blue-600' : 'text-white'}`}>LiS</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={`text-base sm:text-lg font-semibold truncate ${voiceOnlyMode ? 'text-white' : 'text-gray-900'}`}>
                  {voiceOnlyMode ? 'Sprachmodus' : 'LiS Chatbot'}
                </h1>
                <p className={`text-[11px] sm:text-xs truncate ${voiceOnlyMode ? 'text-blue-100' : 'text-gray-500'}`}>
                  {voiceOnlyMode ? 'Sprich weiter, um das Gespräch fortzusetzen' : 'Stelle deine Fragen per Text oder Sprache'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!voiceOnlyMode && (
                <button
                  onClick={() => setShowChatSidebar(!showChatSidebar)}
                  className="p-2.5 sm:p-2 rounded-lg text-gray-500 active:bg-gray-100 transition-colors touch-manipulation flex-shrink-0"
                  title="Chats anzeigen"
                  aria-label="Chats anzeigen"
                >
                  <MessageSquare className="h-5 w-5 sm:h-5 sm:w-5" />
                </button>
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
                  className="p-2.5 sm:p-2 rounded-lg text-gray-500 active:text-red-600 active:bg-red-50 transition-colors touch-manipulation flex-shrink-0"
                  title="Chatverlauf löschen"
                  aria-label="Chatverlauf löschen"
                >
                  <Trash2 className="h-5 w-5 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages - Mobile optimized scrolling */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-4 sm:px-4 sm:py-5 overscroll-contain">
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4 py-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Mic className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Starte ein Gespräch
              </h2>
              <p className="text-sm sm:text-base text-gray-600 max-w-sm leading-relaxed">
                Schreibe eine Nachricht oder nutze das Mikrofon. Ich helfe dir gerne bei Abfragen deiner Supabase-Datenbank.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-2 duration-200 group`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[75%] rounded-2xl sm:rounded-xl px-4 py-3 sm:px-4 sm:py-2.5 relative ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="text-[15px] sm:text-[15px] leading-relaxed flex-1 break-words">
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Headings
                          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-gray-900" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1 text-gray-900" {...props} />,
                          
                          // Paragraphs
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0 text-gray-900 leading-relaxed" {...props} />,
                          
                          // Lists
                          ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5" {...props} />,
                          li: ({ node, ...props }) => <li className="pl-1.5 text-gray-900 leading-relaxed" {...props} />,
                          
                          // Code
                          code: ({ node, inline, className, children, ...props }: any) => {
                            return inline ? (
                              <code className="bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-gray-50 text-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto my-3 border border-gray-200 shadow-sm" {...props}>
                                {children}
                              </code>
                            )
                          },
                          pre: ({ node, ...props }) => <pre className="my-3" {...props} />,
                          
                          // Links
                          a: ({ node, ...props }) => (
                            <a 
                              className="text-blue-600 hover:text-blue-800 underline transition-colors" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              {...props} 
                            />
                          ),
                          
                          // Tables - Enhanced styling for query results
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 shadow-sm">
                              <table className="min-w-full border-collapse bg-white" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => <thead className="bg-gradient-to-r from-blue-50 to-blue-100" {...props} />,
                          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-100" {...props} />,
                          tr: ({ node, ...props }) => <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors" {...props} />,
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100" {...props} />
                          ),
                          
                          // Blockquotes
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-3 italic text-gray-700 bg-blue-50 rounded-r" {...props} />
                          ),
                          
                          // Strong & Em
                          strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                          em: ({ node, ...props }) => <em className="italic text-gray-800" {...props} />,
                          
                          // Horizontal Rule
                          hr: ({ node, ...props }) => <hr className="my-4 border-t-2 border-gray-200" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(message.content, index)}
                    className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 sm:p-1 rounded-lg touch-manipulation active:scale-95 flex-shrink-0 ${
                      message.role === 'user'
                        ? 'active:bg-blue-700 text-white'
                        : 'active:bg-gray-100 text-gray-600'
                    }`}
                    title="Nachricht kopieren"
                    aria-label="Nachricht kopieren"
                  >
                    {copiedIndex === index ? (
                      <Check className="h-4 w-4 sm:h-4 sm:w-4" />
                    ) : (
                      <Copy className="h-4 w-4 sm:h-4 sm:w-4" />
                    )}
                  </button>
                </div>
                    {message.timestamp && (
                  <p
                    className={`text-[11px] sm:text-xs mt-2 sm:mt-1.5 ${
                      message.role === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-400'
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isLoading && showLoadingBubble && !isStreamingResponse && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white rounded-2xl sm:rounded-xl rounded-bl-sm px-4 py-3 sm:px-4 sm:py-2.5 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="animate-spin h-4 w-4 sm:h-4 sm:w-4 text-blue-600" />
                  <span className="text-sm sm:text-sm text-gray-600">Denke nach...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Mobile optimized with larger touch targets */}
      {voiceOnlyMode ? (
        <div className="bg-blue-600 border-t border-blue-700 px-3 py-6 sm:px-4 sm:py-6 safe-area-inset-bottom">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-4">
              {isRecording ? (
                <>
                  {/* Audio Level Visualization */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-red-500 flex items-center justify-center shadow-lg overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-red-600 transition-all duration-100"
                      style={{ 
                        transform: `scale(${0.7 + audioLevel * 0.3})`,
                        opacity: 0.8 + audioLevel * 0.2
                      }}
                    />
                    <MicOff className="h-10 w-10 sm:h-12 sm:w-12 text-white relative z-10" />
                    {/* Audio level bars */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`w-1 h-2 sm:h-3 rounded-full transition-all duration-100 ${
                            audioLevel > i * 0.2 ? 'bg-white' : 'bg-white/30'
                          }`}
                          style={{
                            height: `${2 + audioLevel * 8}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg sm:text-xl font-semibold mb-1">
                      Ich höre zu ...
                    </p>
                    <p className="text-blue-100 text-sm sm:text-base">
                      {audioLevel > 0.1 ? 'Sprich jetzt' : 'Warte auf deine Stimme ...'}
                    </p>
                    {silenceStartTime && (
                      <p className="text-blue-200 text-xs mt-1">
                        Automatischer Stopp in {Math.max(0, Math.ceil((APP_CONFIG.SILENCE_DURATION_MS - (Date.now() - silenceStartTime)) / 1000))}s
                      </p>
                    )}
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-white text-red-600 rounded-xl font-semibold touch-manipulation active:scale-95 shadow-lg"
                  >
                    Aufnahme stoppen
                  </button>
                </>
              ) : isProcessingVoice || isLoading ? (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-white animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg sm:text-xl font-semibold mb-1">
                      {isProcessingVoice ? 'Verarbeite...' : 'Denke nach...'}
                    </p>
                    <p className="text-blue-100 text-sm sm:text-base">
                      {isProcessingVoice ? 'Transkribiere deine Stimme' : 'Antwort wird erstellt'}
                    </p>
                  </div>
                </>
              ) : isPlayingAudio ? (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500 flex items-center justify-center animate-pulse shadow-lg">
                    <Volume2 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg sm:text-xl font-semibold mb-1">
                      Assistent spricht ...
                    </p>
                    <p className="text-blue-100 text-sm sm:text-base mb-3">
                      Höre dir die Antwort an
                    </p>
                    <button
                      onClick={stopSpeaking}
                      className="px-6 py-3 bg-white text-green-600 rounded-xl font-semibold touch-manipulation active:scale-95 shadow-lg"
                    >
                      Unterbrechen & sprechen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <Mic className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg sm:text-xl font-semibold mb-1">
                      Bereit zuzuhören
                    </p>
                    <p className="text-blue-100 text-sm sm:text-base">
                      Tippe, um zu sprechen
                    </p>
                  </div>
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold touch-manipulation active:scale-95 shadow-lg"
                  >
                    Jetzt sprechen
                  </button>
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
      ) : (
        <div className="bg-white border-t border-gray-100 px-3 py-3 sm:px-4 sm:py-3 safe-area-inset-bottom">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2.5 sm:gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nachricht eingeben..."
                  className="w-full p-3 sm:p-3 pr-14 sm:pr-12 pb-10 sm:pb-8 border-2 border-gray-200 rounded-xl sm:rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 text-[16px] sm:text-[15px] transition-all"
                  rows={1}
                  maxLength={APP_CONFIG.MAX_INPUT_LENGTH}
                  style={{ 
                    minHeight: `${UI_CONFIG.TEXTAREA_MIN_HEIGHT}px`, 
                    maxHeight: `${UI_CONFIG.TEXTAREA_MAX_HEIGHT}px` 
                  }}
                />
                <div className="absolute bottom-2 right-3 sm:bottom-1.5 sm:right-2 flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs text-gray-400">
                    {input.length} / {APP_CONFIG.MAX_INPUT_LENGTH}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-1.5 flex-shrink-0">
                <button
                  onClick={isRecording ? stopRecording : enterVoiceOnlyMode}
                  disabled={isLoading}
                  className={`p-3 sm:p-2.5 rounded-xl sm:rounded-lg transition-all duration-150 touch-manipulation active:scale-95 ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
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
                    onClick={isPlayingAudio ? stopSpeaking : playLastResponse}
                    disabled={isLoading}
                    className={`p-3 sm:p-2.5 rounded-xl sm:rounded-lg transition-all duration-150 touch-manipulation active:scale-95 ${
                      isPlayingAudio
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
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
                  onClick={sendMessage}
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
      )}
    </div>
  )
}
