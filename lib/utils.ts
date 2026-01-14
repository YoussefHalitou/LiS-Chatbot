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
  
  // Define German month names for use throughout the function
  const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  
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
  
  // =========================================================================
  // CRITICAL: Fix malformed markdown tables where rows run together
  // The LLM often generates tables like: "| A | B | | C | D |" instead of
  // proper rows on separate lines
  // =========================================================================
  
  // Fix split dates where day number is on one line and month on next
  // Pattern: "|1\nJanuar |" or "| 1 \nJanuar |" -> "| 1. Januar |"
  // This happens when streaming breaks up the date
  germanMonths.forEach(month => {
    // Fix pattern: "| N\nMonth" where N is a day number (1-31)
    const splitDateRegex = new RegExp(`\\|\\s*(\\d{1,2})\\s*\\n\\s*(${month})\\s*\\|`, 'gi')
    sanitized = sanitized.replace(splitDateRegex, '| $1. $2 |')
    
    // Also fix when there's content between: "|1\t\t\nJanuar |"
    const splitDateWithTabsRegex = new RegExp(`\\|\\s*(\\d{1,2})\\s*\\t*\\s*\\n\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(splitDateWithTabsRegex, '| $1. $2')
    
    // CRITICAL: Fix "Datum: 1\nJanuar 2026" pattern where date is split after "Datum:"
    // This happens when the full date like "13. Januar 2026" gets truncated to just "1" + newline + "Januar"
    const datumSplitRegex = new RegExp(`(Datum:)\\s*(\\d{1,2})\\s*\\n\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(datumSplitRegex, '$1 $2. $3')
    
    // CRITICAL: Fix "Datum:\n1\n\nJanuar" pattern (day on its own line with extra newlines)
    const datumDoubleSplitRegex = new RegExp(`(Datum:)\\s*\\n\\s*(\\d{1,2})\\s*\\n+\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(datumDoubleSplitRegex, '$1 $2. $3')
    
    // CRITICAL: Fix "Datum:\nJanuar" pattern (day number completely missing)
    // In this case, we can't recover the day, but we should clean up the formatting
    const datumNoDay = new RegExp(`(Datum:)\\s*\\n\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(datumNoDay, '$1 $2')
    
    // Also fix pattern where date is in a list item: "- Datum: 1\nJanuar 2026"
    const listDateSplitRegex = new RegExp(`(-\\s*Datum:)\\s*(\\d{1,2})\\s*\\n\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(listDateSplitRegex, '$1 $2. $3')
    
    // Fix "Datum:\n1\nJanuar" in list items
    const listDateDoubleSplitRegex = new RegExp(`(-\\s*Datum:)\\s*\\n\\s*(\\d{1,2})\\s*\\n+\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(listDateDoubleSplitRegex, '$1 $2. $3')
  })
  
  // Fix dates that appear without day part (just the number then month)
  // Pattern: "| 1 \nJanuar 2026" -> "| 1. Januar 2026"
  germanMonths.forEach(month => {
    const dateNoDoRegex = new RegExp(`(\\d{1,2})\\s+(${month})\\s+(\\d{4})`, 'g')
    sanitized = sanitized.replace(dateNoDoRegex, (match, day, m, year) => {
      // Only add dot if not already there
      if (!day.endsWith('.')) {
        return `${day}. ${m} ${year}`
      }
      return match
    })
    
    // Also fix dates with just day and month (no year): "Datum: 1\nJanuar" -> "Datum: 1. Januar"
    const dateNoYearRegex = new RegExp(`(Datum:.*?)(\\d{1,2})\\s*\\n\\s*(${month})(?!\\s*\\d{4})`, 'gi')
    sanitized = sanitized.replace(dateNoYearRegex, '$1$2. $3')
    
    // Fix pattern where day is on separate line: "Datum:\n9.\nJanuar" -> "Datum: 9. Januar"
    const daySeparateLineRegex = new RegExp(`(Datum:)\\s*\\n\\s*(\\d{1,2}\\.?)\\s*\\n\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(daySeparateLineRegex, (match, prefix, day, m) => {
      const dayNum = day.endsWith('.') ? day : day + '.'
      return `${prefix} ${dayNum} ${m}`
    })
    
    // CRITICAL: Fix "Datum:\n\n1\n\nJanuar" pattern with multiple newlines
    const multiNewlineDate = new RegExp(`(Datum:)\\s*\\n+\\s*(\\d{1,2})\\.?\\s*\\n+\\s*(${month})`, 'gi')
    sanitized = sanitized.replace(multiNewlineDate, '$1 $2. $3')
    
    // Also fix in project listings: "Datum:\n1\n\nJanuar 2026 -"
    const projectDatePattern = new RegExp(`(Datum:)\\s*\\n+\\s*(\\d{1,2})\\s*\\n+\\s*(${month})\\s+(\\d{4})`, 'gi')
    sanitized = sanitized.replace(projectDatePattern, '$1 $2. $3 $4')
  })
  
  // First pass: Fix obvious double-pipe row breaks (| | or ||)
  // Pattern: "| value | value | | next row |" -> "| value | value |\n| next row |"
  sanitized = sanitized.replace(/\|\s*\|\s*\|/g, '|\n|')
  sanitized = sanitized.replace(/\|\s*\|([A-Za-zäöüÄÖÜß0-9])/g, '|\n| $1')
  
  // Fix pattern where pipe is followed by space, pipe, then content
  // "| value | | next |" -> "| value |\n| next |"
  sanitized = sanitized.replace(/(\|[^|\n]+)\s*\|\s*\|/g, '$1 |\n|')
  
  // Fix table rows that have content | | content pattern (missing newline between rows)
  sanitized = sanitized.replace(/(\|[^|\n]+\|)\s*\|\s*([A-Za-zäöüÄÖÜß])/g, '$1\n| $2')
  
  // Fix cases where table row ends with "|" followed immediately by "|" and new row
  sanitized = sanitized.replace(/\|\s*\n?\s*\|([^-\n|])/g, '|\n| $1')
  
  // Fix the specific pattern where table cell ends with "|" then newline then month
  // This happens when the LLM generates: "| 13. |\nJanuar 2026 |" 
  germanMonths.forEach(month => {
    const pipeMonthRegex = new RegExp(`\\|\\s*\\n(${month})\\s*(\\d{4})?\\s*\\|`, 'gi')
    sanitized = sanitized.replace(pipeMonthRegex, ' $1 $2 |')
  })
  
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
  
  // =========================================================================
  // CRITICAL: Advanced table row splitting
  // Detect lines that contain multiple complete table rows and split them
  // =========================================================================
  const splitTableRows = (text: string): string => {
    const lines = text.split('\n')
    const result: string[] = []
    
    for (const line of lines) {
      // Skip if line doesn't look like a table or is a separator
      if (!line.includes('|') || line.match(/^[\s|:-]+$/)) {
        result.push(line)
        continue
      }
      
      // Count pipes - a valid single table row should have balanced pipes
      const pipes = (line.match(/\|/g) || []).length
      
      // If we have many pipes (more than ~10), this line likely contains multiple rows
      // Split on pattern: "| content |" followed by "| content |"
      if (pipes > 8) {
        // Try to split by finding repeated row patterns
        // Pattern: end of row (|) followed by start of row (|) with optional space
        const splitLine = line.replace(/\|\s*\|(?=[A-Za-zäöüÄÖÜß0-9])/g, '|\n|')
        if (splitLine.includes('\n')) {
          result.push(...splitLine.split('\n'))
          continue
        }
      }
      
      result.push(line)
    }
    
    return result.join('\n')
  }
  
  sanitized = splitTableRows(sanitized)
  
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
  
  // CRITICAL: Fix table row separators running together
  // Pattern: "|---|---||05. Januar |3 |" should have newlines between rows
  // Fix double pipes that indicate missing newlines in tables
  sanitized = sanitized.replace(/\|\s*\|\s*\|/g, '|\n|')
  sanitized = sanitized.replace(/(\|[^|\n]+\|)\s*\|([^-\n])/g, '$1\n| $2')
  
  // Fix table rows that run together (pipe followed immediately by pipe-dash)
  sanitized = sanitized.replace(/\|\s*\|(---)/g, '|\n|$1')
  
  // Fix table data rows running together (end of row immediately followed by start of next)
  sanitized = sanitized.replace(/(\|)\s*\|([A-Za-zäöüÄÖÜß0-9])/g, '$1\n| $2')
  
  // CRITICAL: Fix missing space between German month names and years
  // Pattern: "Januar2026" should become "Januar 2026"
  germanMonths.forEach(month => {
    const regex = new RegExp(`(${month})(\\d{4})`, 'g')
    sanitized = sanitized.replace(regex, '$1 $2')
  })
  
  // Fix missing space after colon in key-value pairs
  // Pattern: "Stundensatz:35,00" should become "Stundensatz: 35,00"
  sanitized = sanitized.replace(/([A-Za-zäöüÄÖÜß]+):([0-9])/g, '$1: $2')
  
  // CRITICAL: Fix price/currency followed directly by list number
  // Pattern: "25 €2. Pi" should become "25 €\n\n2. Pi"
  // Pattern: "30 €1\nThor" is actually "30 €\n\n10. Thor" (two-digit number split)
  sanitized = sanitized.replace(/([€$])\s*(\d+\.)\s+([A-Za-zäöüÄÖÜß])/g, '$1\n\n$2 $3')
  
  // Fix two-digit list numbers that got split across lines
  // Pattern: "€1\nThor" where "1\n" is actually "10." split -> reconstruct as "10. Thor"
  // Pattern: "€1\nDen" where "1\n" is actually "11." split
  sanitized = sanitized.replace(/([€$])\s*1\s*\n\s*([A-Za-zäöüÄÖÜß])/g, (match, currency, name) => {
    // This is likely "10. Name" or "11. Name" etc. that got split
    // We'll format it as a new numbered list item
    return `${currency}\n\n10. ${name}`
  })
  
  // More general: fix any number followed by newline then name (likely split list numbers)
  // Pattern: "€1\n0. Thor" should stay as "10. Thor" but "€1\nThor" should become "10. Thor"
  sanitized = sanitized.replace(/([€$])\s*(\d)\s*\n\s*(\d+\.)\s+([A-Za-zäöüÄÖÜß])/g, '$1\n\n$2$3 $4')
  
  // Fix key-value pairs running together on same line (should be separate lines)
  // Pattern: "- Name: Rika\nVertragsart: Intern" should become "- Name: Rika\n- Vertragsart: Intern"
  // First, ensure items after "- Something:" on new lines also get bullet points
  sanitized = sanitized.replace(/(-\s+[^:\n]+:[^\n]+)\n([A-Za-zäöüÄÖÜß]+:)/g, '$1\n- $2')
  
  // Fix pattern where key-value list items run together without newlines
  // Pattern: "- Name: Rika Vertragsart: Intern" should split into separate items
  sanitized = sanitized.replace(/(-\s+[^:\n]+:\s*[^\n]+?)\s+([A-Za-zäöüÄÖÜß]+:\s*[^\n]+)/g, '$1\n- $2')
  
  // Ensure blank line before bullet lists that follow text ending with period or colon
  sanitized = sanitized.replace(/([.:])\s*\n(-\s+[A-Za-zäöüÄÖÜß]+:)/g, '$1\n\n$2')
  
  // CRITICAL: Fix markdown list formatting issues
  // Ensure numbered lists have proper newlines before them
  // Pattern: "text:1. " or "text.1. " should become "text:\n\n1. " or "text.\n\n1. "
  sanitized = sanitized.replace(/([.:!?])\s*(\d+\.)\s+/g, '$1\n\n$2 ')
  
  // CRITICAL: Fix numbered list items after currency amounts
  // Pattern: "Stundensatz: 25 €2. Name" should become "Stundensatz: 25 €\n\n2. Name"
  // This is a very common pattern in the employee list output
  sanitized = sanitized.replace(/(\d+\s*€)(\d+\.)\s+([A-Za-zäöüÄÖÜß])/g, '$1\n\n$2 $3')
  
  // Also handle without space: "25€2. Name"
  sanitized = sanitized.replace(/(\d+€)(\d+\.)\s+([A-Za-zäöüÄÖÜß])/g, '$1\n\n$2 $3')
  
  // Fix "Einsätze: 12." pattern where number is part of count followed by list item
  // Pattern: "Einsätze: 12. Mitarbeiter:" should become "Einsätze: 1\n\n2. Mitarbeiter:"
  sanitized = sanitized.replace(/(\d+)\s*(\d+\.)\s+(\*\*)?([A-Za-zäöüÄÖÜß])/g, '$1\n\n$2 $3$4')
  
  // Ensure numbered lists that start mid-text get proper line breaks
  // Pattern: "word1. Projekt:" should become "word\n\n1. Projekt:"
  sanitized = sanitized.replace(/([a-zA-ZäöüÄÖÜß])(\d+\.)\s+/g, '$1\n\n$2 ')
  
  // Fix numbered list items running together
  // Pattern: "item1\n2. item2" should stay, but "item12. item2" should become "item1\n\n2. item2"
  sanitized = sanitized.replace(/([^\n])(\n?)(\d+\.)\s+/g, (match, before, newline, number) => {
    // If there's already a newline, keep it
    if (newline) return match
    // If the character before is a letter/word character, add double newline
    if (/[a-zA-ZäöüÄÖÜß]/.test(before)) {
      return `${before}\n\n${number} `
    }
    return match
  })
  
  // Fix bold text followed immediately by text without space
  // Pattern: "**Datum:**15" should become "**Datum:** 15"
  sanitized = sanitized.replace(/(\*\*[^*]+:\*\*)([^\s\n])/g, '$1 $2')
  
  // Fix bold text followed immediately by numbers
  // Pattern: "**Text**15" should become "**Text** 15"
  sanitized = sanitized.replace(/(\*\*[^*]+\*\*)(\d)/g, '$1 $2')
  
  // Ensure bullet points have proper spacing
  // Pattern: "- item1- item2" should become "- item1\n- item2"
  sanitized = sanitized.replace(/-\s+([^\n-]+)-\s+/g, '- $1\n- ')
  
  // Ensure there's a blank line before lists that come after text
  // Pattern: "some text\n1. item" should become "some text\n\n1. item"
  sanitized = sanitized.replace(/([a-zA-ZäöüÄÖÜß.:!?])\n(\d+\.\s)/g, '$1\n\n$2')
  sanitized = sanitized.replace(/([a-zA-ZäöüÄÖÜß.:!?])\n(-\s)/g, '$1\n\n$2')
  
  // Fix "Mitarbeiter:\n\nUnbekannt" followed immediately by next numbered item
  // Pattern: "Unbekannt2. Projekt" should become "Unbekannt\n\n2. Projekt"
  sanitized = sanitized.replace(/(Unbekannt)(\d+\.)/g, '$1\n\n$2')
  
  // Fix employee names running into next item
  // Pattern: "Pi\nSco Thom2. Projekt" should become proper list
  sanitized = sanitized.replace(/([A-Za-zäöüÄÖÜß]+)(\d+\.)\s+(Projekt)/g, '$1\n\n$2 $3')
  
  // Fix missing line break after "Mitarbeiter:" list items
  sanitized = sanitized.replace(/(Mitarbeiter:)\s*\n\s*-\s*/g, '$1\n  - ')
  
  // Ensure consistent spacing in lists with sub-items (Mitarbeiter)
  sanitized = sanitized.replace(/\n\s*-\s+/g, '\n  - ')
  
  // Clean up excessive whitespace but preserve intentional double newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

