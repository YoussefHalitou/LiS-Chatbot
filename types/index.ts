/**
 * Shared TypeScript types for the application
 */

export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp?: Date
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
}

export interface ChatRequest {
  messages: Message[]
  chatId?: string
}

export interface Chat {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

export interface STTResponse {
  transcript: string
  error?: string
}

export interface TTSResponse {
  audioUrl?: string
  error?: string
}

export interface AudioLevel {
  level: number
  timestamp: number
}

export interface VoiceActivityDetection {
  isActive: boolean
  silenceStartTime: number | null
  audioLevel: number
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export interface BrowserSupport {
  mediaDevices: boolean
  mediaRecorder: boolean
  speechSynthesis: boolean
}

export interface RecordingState {
  isRecording: boolean
  isProcessing: boolean
  error: string | null
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  error: string | null
}

