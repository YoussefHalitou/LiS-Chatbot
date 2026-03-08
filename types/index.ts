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
  reactions?: { [emoji: string]: number }
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
  lastMessage?: string
  isPinned?: boolean
  icon?: string
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

// ─── Server-side shared types ───────────────────────────────────

/** A single tool call in an OpenAI-compatible message */
export interface ToolCallItem {
  id?: string
  type?: 'function'
  function: {
    name?: string
    arguments: string
  }
}

/** OpenAI-compatible chat message (used server-side in streaming, tool handling, inference) */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool'
  content: string | null
  name?: string
  tool_calls?: ToolCallItem[]
  tool_call_id?: string
}

/** A structured filter value for Supabase queries (eq, neq, gte, between, ilike, etc.) */
export interface StructuredFilter {
  type: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'like' | 'ilike' | 'in'
  value: JsonValue
}

/** A filter map value — either a primitive or a structured filter object */
export type FilterValue = string | number | boolean | null | StructuredFilter

/** Map of column names to filter values, used in queryTable / updateRow / etc. */
export type FilterMap = Record<string, FilterValue>

/** JSON-serializable value — replaces `any` for data that will be JSON.stringify'd */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/** Record of string keys to unknown values — replaces Record<string, any> for generic row data */
export type RowRecord = Record<string, unknown>

