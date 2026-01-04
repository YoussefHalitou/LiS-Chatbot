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

/**
 * Removes JSON and internal tool result messages from bot responses
 * This prevents the bot from showing raw JSON or internal instructions to users
 */
export const sanitizeBotResponse = (content: string | null | undefined): string => {
  if (!content) return ''
  
  let sanitized = content
  
  // Remove internal tool result instructions (handle both single-line and multi-line)
  sanitized = sanitized.replace(/\[INTERNAL TOOL RESULT[^\]]*\][\s\n]*/gi, '')
  // Also remove if it spans multiple lines or has extra whitespace
  sanitized = sanitized.replace(/\[INTERNAL TOOL RESULT[\s\S]*?DO NOT SHOW THIS JSON TO THE USER!\]\s*/gi, '')
  
  // Remove JSON code blocks (most common case)
  sanitized = sanitized.replace(/```json[\s\S]*?```/gi, '')
  sanitized = sanitized.replace(/```[\s\S]*?```/g, (match) => {
    // Check if it looks like JSON (contains "data" or "error" keys)
    const codeContent = match.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
    if (codeContent.includes('"data"') || codeContent.includes('"error"') || 
        codeContent.includes("'data'") || codeContent.includes("'error'") ||
        (codeContent.startsWith('{') && codeContent.includes('"data"'))) {
      try {
        JSON.parse(codeContent)
        return '' // Remove JSON code blocks
      } catch {
        // Might be partial JSON, remove anyway if it has data/error
        return ''
      }
    }
    return match // Keep non-JSON code blocks
  })
  
  // Remove inline JSON objects that look like tool results
  // Match objects starting with { and containing "data" or "error"
  sanitized = sanitized.replace(/\{\s*"data"\s*:[\s\S]*?\}/g, '')
  sanitized = sanitized.replace(/\{\s*"error"\s*:[\s\S]*?\}/g, '')
  sanitized = sanitized.replace(/\{\s*"data"\s*:[\s\S]*?"error"[\s\S]*?\}/g, '')
  
  // More aggressive: remove any JSON object that contains "data" or "error" as keys
  sanitized = sanitized.replace(/\{[^{}]*"data"[^{}]*\}/g, '')
  sanitized = sanitized.replace(/\{[^{}]*"error"[^{}]*\}/g, '')
  
  // Handle multi-line JSON objects (more complex matching)
  // Match { ... "data": ... } patterns across multiple lines
  sanitized = sanitized.replace(/\{\s*[\s\S]*?"data"\s*:[\s\S]*?\}/g, '')
  sanitized = sanitized.replace(/\{\s*[\s\S]*?"error"\s*:[\s\S]*?\}/g, '')
  
  // Remove standalone JSON objects on their own lines
  const jsonLines = sanitized.split('\n')
  const filteredLines = jsonLines.filter(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        // If it's a tool result object, remove it
        if (parsed.data !== undefined || parsed.error !== undefined) {
          return false
        }
      } catch {
        // Not valid JSON, keep it
      }
    }
    // Also check for partial JSON objects
    if (trimmed.startsWith('{') && (trimmed.includes('"data"') || trimmed.includes('"error"'))) {
      return false
    }
    return true
  })
  sanitized = filteredLines.join('\n')
  
  // Clean up multiple newlines (but preserve table spacing)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n')
  
  // CRITICAL: Ensure tables have blank line before them
  // Match patterns like "text:| Header |" and add blank line: "text:\n\n| Header |"
  sanitized = sanitized.replace(/([^\n]):\s*\n\|/g, '$1:\n\n|')
  sanitized = sanitized.replace(/([^\n])\.\s*\n\|/g, '$1.\n\n|')
  // Also handle cases where table starts immediately after text
  sanitized = sanitized.replace(/([^\n]):\s*\|/g, '$1:\n\n|')
  sanitized = sanitized.replace(/([^\n])\.\s*\|/g, '$1.\n\n|')
  
  // CRITICAL: Fix table formatting - ensure each table row is on its own line
  // First, fix malformed separator rows with too many pipes (like ||||||||---------|)
  // Remove excessive pipes before separator
  sanitized = sanitized.replace(/\|+\s*([-]{2,})\s*\|/g, '|$1|')
  // Fix separator rows that have pipes mixed incorrectly
  sanitized = sanitized.replace(/\|+\s*([-|]{3,})\s*\|/g, (match) => {
    // Count how many columns we need based on dashes
    const dashes = match.match(/-+/g) || []
    const columnCount = dashes.length
    // Create proper separator: |---|---| ---|
    return '|' + '---|'.repeat(columnCount)
  })
  
  // Fix cases where header row and separator row are on the same line
  // Pattern: | Header | Header | Header ||----|----|----|
  // This matches: |...| followed by ||----| (no newline between)
  sanitized = sanitized.replace(/(\|[^|\n]+\|)\s*\|\s*([-|]{2,})\s*\|/g, '$1\n|$2|')
  // Fix cases where separator row directly follows header without newline (more flexible)
  // Match: | Header | followed by |----| or ----| (with or without leading |)
  sanitized = sanitized.replace(/(\|[^|\n]+\|)\s*([|-]{3,})/g, '$1\n|$2|')
  // Fix cases where separator row directly follows header with double pipe (||----|)
  sanitized = sanitized.replace(/(\|[^|\n]+\|)\|\s*([-|]{2,})\s*\|/g, '$1\n|$2|')
  // Fix cases where multiple table rows are on same line (header and data row)
  sanitized = sanitized.replace(/(\|[^|\n]+\|)\s*\|([^|\n]+)\|/g, '$1\n|$2|')
  
  // Normalize separator rows - ensure they match header column count
  const tableLines = sanitized.split('\n')
  const fixedLines: string[] = []
  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i]
    const nextLine = tableLines[i + 1]
    
    // If current line is a header row (starts with | and contains text, not just dashes)
    if (line.match(/^\|\s*[^|]+\s*\|/) && !line.match(/^[\s|:-]+$/)) {
      // Count columns in header
      const headerColumns = (line.match(/\|/g) || []).length - 1
      
      // Check if next line is a separator row
      if (nextLine && nextLine.match(/^\|[\s|:-]+\|$/)) {
        // Create proper separator row with correct column count
        const separator = '|' + '---|'.repeat(headerColumns)
        fixedLines.push(line)
        fixedLines.push(separator)
        i++ // Skip the malformed separator line
        continue
      }
    }
    
    fixedLines.push(line)
  }
  sanitized = fixedLines.join('\n')
  
  // CRITICAL: Convert tab-separated tables to pipe-separated Markdown tables
  // Pattern: "Name\tVertragsart\tStundensatz" -> "| Name | Vertragsart | Stundensatz |"
  // First, identify table-like structures (multiple lines with tabs)
  const lines = sanitized.split('\n')
  const processedLines: string[] = []
  let inTable = false
  let tableStartIndex = -1
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const hasTabs = line.includes('\t')
    const tabCount = (line.match(/\t/g) || []).length
    
    // If line has tabs and looks like a table row
    if (hasTabs && tabCount >= 1) {
      if (!inTable) {
        inTable = true
        tableStartIndex = i
        // Add blank line before table if previous line doesn't end with colon
        if (i > 0 && !lines[i - 1].trim().endsWith(':')) {
          processedLines.push('')
        }
      }
      // Convert tabs to pipes
      const cells = line.split('\t').map((cell: string) => cell.trim())
      processedLines.push('| ' + cells.join(' | ') + ' |')
    } else {
      if (inTable && tableStartIndex >= 0) {
        // We were in a table, now we're not
        // Add separator row after header if we have at least 2 rows
        const tableRows = processedLines.slice(tableStartIndex)
        if (tableRows.length >= 1) {
          // Check if first row looks like a header (has text, not just dashes)
          const firstRow = tableRows[0]
          if (firstRow && !firstRow.match(/^[\s|:-]+$/)) {
            // Count columns
            const columnCount = (firstRow.match(/\|/g) || []).length - 1
            // Insert separator after header
            processedLines[tableStartIndex] = firstRow
            processedLines.splice(tableStartIndex + 1, 0, '|' + '---|'.repeat(columnCount))
          }
        }
        inTable = false
        tableStartIndex = -1
      }
      processedLines.push(line)
    }
  }
  
  // Handle case where table ends at end of text
  if (inTable && tableStartIndex >= 0) {
    const tableRows = processedLines.slice(tableStartIndex)
    if (tableRows.length >= 1) {
      const firstRow = tableRows[0]
      if (firstRow && !firstRow.match(/^[\s|:-]+$/)) {
        const columnCount = (firstRow.match(/\|/g) || []).length - 1
        processedLines[tableStartIndex] = firstRow
        processedLines.splice(tableStartIndex + 1, 0, '|' + '---|'.repeat(columnCount))
      }
    }
  }
  
  sanitized = processedLines.join('\n')
  
  // CRITICAL: Convert comma-separated Mitarbeiter lists to Markdown lists
  // Pattern: "Mitarbeiter: Den, Las" -> "Mitarbeiter:\n  - Den\n  - Las"
  // Also handle cases like "Mitarbeiter:\nDen, Las" or "Mitarbeiter:\n\nDen, Las"
  sanitized = sanitized.replace(/(\*\*Mitarbeiter:\*\*|Mitarbeiter:)\s*\n?\s*([A-Za-zäöüÄÖÜß\s,]+?)(?=\n|$)/g, (match, label, names) => {
    // Split by comma and clean up
    const nameList = names.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0 && n !== 'Mitarbeiter')
    if (nameList.length > 0) {
      const listItems = nameList.map((name: string) => `  - ${name}`).join('\n')
      return `${label}\n${listItems}`
    }
    return match
  })
  
  // Also handle cases with spaces: "Mitarbeiter:\n\nFatih Khalid" -> "Mitarbeiter:\n  - Fatih\n  - Khalid"
  sanitized = sanitized.replace(/(\*\*Mitarbeiter:\*\*|Mitarbeiter:)\s*\n\s*\n\s*([A-Za-zäöüÄÖÜß]+(?:\s+[A-Za-zäöüÄÖÜß]+)+)/g, (match, label, names) => {
    // Split by spaces (but keep multi-word names together if they look like names)
    const nameList = names.split(/\s+/).filter((n: string) => n.length > 0 && n !== 'Mitarbeiter')
    if (nameList.length > 0) {
      const listItems = nameList.map((name: string) => `  - ${name}`).join('\n')
      return `${label}\n${listItems}`
    }
    return match
  })
  
  // Handle cases with dashes: "Mitarbeiter: Den- Las" -> "Mitarbeiter:\n  - Den\n  - Las"
  sanitized = sanitized.replace(/(\*\*Mitarbeiter:\*\*|Mitarbeiter:)\s*([A-Za-zäöüÄÖÜß\s-]+)/g, (match, label, names) => {
    // Only process if it contains a dash and looks like a list
    if (names.includes('-') && names.match(/[A-Za-zäöüÄÖÜß]+\s*-\s*[A-Za-zäöüÄÖÜß]+/)) {
      const nameList = names.split('-').map((n: string) => n.trim()).filter((n: string) => n.length > 0 && n !== 'Mitarbeiter')
      if (nameList.length > 0) {
        const listItems = nameList.map((name: string) => `  - ${name}`).join('\n')
        return `${label}\n${listItems}`
      }
    }
    return match
  })
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

