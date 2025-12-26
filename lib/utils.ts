/**
 * Utility functions for the application
 */

import { APP_CONFIG } from './constants'

/**
 * Delay execution by specified milliseconds
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format text for speech synthesis
 * Converts markdown-like structures to natural speech
 */
export const formatTextForSpeech = (text: string): string => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  
  const bulletRegex = /^(\d+\.|[-*•])\s+/
  const bulletLines = lines.filter((line) => bulletRegex.test(line))

  if (bulletLines.length >= 2 && bulletLines.length >= lines.length / 2) {
    return bulletLines
      .map((line, index) => {
        const cleanLine = line.replace(bulletRegex, '')
        return `Punkt ${index + 1}: ${cleanLine}`
      })
      .join('. ')
  }

  return lines.join('. ')
}

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Gerade eben'
  if (minutes < 60) return `${minutes} Min.`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} Std.`
  
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Validate audio blob size
 */
export const isValidAudioBlob = (blob: Blob): boolean => {
  return blob.size >= APP_CONFIG.MIN_AUDIO_BLOB_SIZE
}

/**
 * Get file extension from MIME type
 */
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a'
  }
  if (mimeType.includes('ogg')) {
    return 'ogg'
  }
  if (mimeType.includes('aac')) {
    return 'aac'
  }
  return 'webm'
}

/**
 * Check if browser supports required APIs
 */
export const checkBrowserSupport = (): {
  mediaDevices: boolean
  mediaRecorder: boolean
  speechSynthesis: boolean
} => {
  return {
    mediaDevices: typeof navigator !== 'undefined' && 
                  typeof navigator.mediaDevices !== 'undefined' &&
                  typeof navigator.mediaDevices.getUserMedia === 'function',
    mediaRecorder: typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined',
    speechSynthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
  }
}

/**
 * Get user-friendly error message for microphone errors
 */
export const getMicrophoneErrorMessage = (error: Error): string => {
  const errorName = error.name || ''
  
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return 'Der Mikrofonzugriff wurde blockiert. Bitte erlaube den Zugriff in den Browsereinstellungen.'
  }
  
  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return 'Es wurde kein Mikrofon gefunden. Bitte verbinde ein Mikrofon.'
  }
  
  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return 'Das Mikrofon wird bereits von einer anderen Anwendung verwendet.'
  }
  
  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return 'Die Mikrofoneinstellungen konnten nicht übernommen werden.'
  }
  
  return 'Der Mikrofonzugriff wurde verweigert.'
}

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().slice(0, APP_CONFIG.MAX_INPUT_LENGTH)
}

/**
 * Check if text is a confirmation message
 */
export const isConfirmationMessage = (text: string): boolean => {
  const normalized = text
    .toLowerCase()
    .replace(/[.,!?/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  if (!normalized) return false

  const confirmations = [
    'ja', 'jap', 'jo', 'yes', 'ok', 'okay', 'klar',
    'bitte', 'mach', 'machs', 'machs bitte', 'bitte eintragen',
  ]

  return confirmations.some((confirmation) => normalized.includes(confirmation))
}

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

