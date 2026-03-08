/**
 * Inference and helper utilities for the chat API.
 *
 * Contains date/project inference, text normalization,
 * insert payload extraction, conversation context management,
 * and filter application logic.
 */

import {
  queryTable,
  getTableNames,
  getTableStructure,
} from '@/lib/supabase-query'
import { INSERT_ALLOWED_TABLES } from '@/lib/constants'

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool'
  content: string
  name?: string
  tool_calls?: any[]
  tool_call_id?: string
}

// ChatRequest is now imported from '@/types'

export type DateRange = {
  start: string
  end: string
}

export const DATE_RANGE_TABLE_FIELDS: Record<string, string> = {
  v_morningplan_full: 'plan_date',
  t_morningplan: 'plan_date',
  v_project_full: 'project_date',
  t_projects: 'project_date',
}


export const PROJECT_FILTER_FIELDS: Record<
  string,
  { name?: string; code?: string; id?: string }
> = {
  v_morningplan_full: { name: 'project_name', code: 'project_code', id: 'project_id' },
  v_project_full: { name: 'project_name', code: 'project_code', id: 'project_id' },
  t_projects: { name: 'name', code: 'project_code', id: 'project_id' },
  t_morningplan: { id: 'project_id' },
}

export const includesAny = (text: string, values: string[]) =>
  values.some((value) => text.includes(value))

export const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10)

/**
 * Formats JSON data with pretty printing for better readability
 */
export const formatJsonOutput = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2)
  } catch (error) {
    // Fallback to simple stringify if formatting fails
    return JSON.stringify(data)
  }
}

/**
 * Creates user-friendly error messages in German
 */
export const formatErrorMessage = (error: string, context?: string): string => {
  const lowerError = error.toLowerCase()

  // Database connection errors
  if (lowerError.includes('connection') || lowerError.includes('connect') || lowerError.includes('timeout')) {
    return 'Es gab ein Problem mit der Datenbankverbindung. Bitte versuche es in einem Moment erneut.'
  }

  // Missing values errors (especially for employee assignment)
  if (lowerError.includes('missing values') || lowerError.includes('missing required')) {
    if (context && context.includes('Mitarbeiter') || context && context.includes('hinzufügen')) {
      return 'Fehler beim Hinzufügen des Mitarbeiters: Bitte stelle sicher, dass sowohl der Mitarbeiter als auch das Projekt existieren. Überprüfe die Namen auf Tippfehler.'
    }
    return 'Es fehlen erforderliche Angaben. Bitte überprüfe deine Eingaben.'
  }

  // Not found errors
  if (lowerError.includes('not found') || lowerError.includes('nicht gefunden') || lowerError.includes('existiert nicht')) {
    if (context) {
      return `${context} wurde nicht gefunden. Bitte überprüfe die Angaben und versuche es erneut.`
    }
    return 'Der gesuchte Eintrag wurde nicht gefunden. Bitte überprüfe die Angaben.'
  }

  // Duplicate/unique constraint errors (especially for employee assignment)
  if (lowerError.includes('duplicate') || lowerError.includes('unique constraint') || lowerError.includes('already exists')) {
    if (context && context.includes('Mitarbeiter') || context && context.includes('hinzufügen')) {
      return 'Der Mitarbeiter ist bereits diesem Projekt zugeordnet.'
    }
    return 'Ein Eintrag mit diesen Daten existiert bereits.'
  }

  // Foreign key errors (employee or plan not found)
  if (lowerError.includes('foreign key') || lowerError.includes('violates foreign key')) {
    if (context && context.includes('Mitarbeiter') || context && context.includes('hinzufügen')) {
      return 'Der Mitarbeiter oder das Projekt konnte nicht gefunden werden. Bitte überprüfe die Namen auf Tippfehler.'
    }
    return 'Ein referenzierter Eintrag existiert nicht. Bitte überprüfe deine Eingaben.'
  }

  // Validation errors
  if (lowerError.includes('validation') || lowerError.includes('invalid') || lowerError.includes('ungültig')) {
    return 'Die eingegebenen Daten sind ungültig. Bitte überprüfe deine Angaben.'
  }

  // Permission/access errors
  if (lowerError.includes('permission') || lowerError.includes('access') || lowerError.includes('nicht erlaubt')) {
    return 'Du hast keine Berechtigung für diese Aktion. Bitte kontaktiere den Administrator.'
  }

  // Generic error with context
  if (context) {
    return `Bei ${context} ist ein Fehler aufgetreten: ${error}`
  }

  // Generic friendly error
  return `Es ist ein Fehler aufgetreten: ${error}. Bitte versuche es erneut oder kontaktiere den Support, wenn das Problem weiterhin besteht.`
}

/**
 * Provides helpful suggestions when no results are found
 * Returns alternative queries and helpful tips
 */
export const getNoResultsSuggestions = async (
  queryType: string,
  filters?: Record<string, any>,
  tableName?: string
): Promise<string> => {
  const suggestions: string[] = []
  const alternatives: string[] = []

  // Get current date for alternative suggestions
  const now = new Date()
  const berlinIsoDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowIsoDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow)

  if (queryType === 'project' || queryType === 'morningplan') {
    suggestions.push('- Überprüfe das Datum (verwende Format: TT.MM.JJJJ)')
    suggestions.push('- Versuche einen anderen Zeitraum')
    suggestions.push('- Prüfe, ob der Projektname korrekt geschrieben ist')

    // Add alternative date suggestions
    if (filters && filters.plan_date) {
      alternatives.push(`- Versuche "Projekte für heute" (${berlinIsoDate})`)
      alternatives.push(`- Versuche "Projekte für morgen" (${tomorrowIsoDate})`)
      alternatives.push('- Versuche "alle Projekte" (ohne Datumsfilter)')
    } else {
      alternatives.push(`- Versuche "Projekte für heute" (${berlinIsoDate})`)
      alternatives.push(`- Versuche "Projekte für morgen" (${tomorrowIsoDate})`)
      alternatives.push('- Versuche "Projekte diese Woche"')
    }
  }

  if (queryType === 'employee') {
    suggestions.push('- Überprüfe die Schreibweise des Mitarbeiternamens')
    suggestions.push('- Prüfe, ob der Mitarbeiter als aktiv markiert ist')
    alternatives.push('- Versuche "alle Mitarbeiter" (ohne Namensfilter)')

    // Try to find similar employee names if we have a name filter
    if (filters && filters.name && tableName === 't_employees') {
      try {
        const similarQuery = await queryTable('t_employees', {}, 50)
        if (similarQuery.data && Array.isArray(similarQuery.data) && similarQuery.data.length > 0) {
          const searchName = typeof filters.name === 'string' ? filters.name.toLowerCase() :
            (filters.name?.value || '').toLowerCase()
          const similarNames = similarQuery.data
            .map((emp: any) => emp.name)
            .filter((name: string) => name && name.toLowerCase().includes(searchName.substring(0, 2)))
            .slice(0, 3)

          if (similarNames.length > 0) {
            alternatives.push(`- Meintest du vielleicht: ${similarNames.join(', ')}?`)
          }
        }
      } catch (error) {
        // Ignore errors in suggestion generation
      }
    }
  }

  if (filters && Object.keys(filters).length > 0) {
    suggestions.push('- Versuche weniger Filter zu verwenden')
    suggestions.push('- Überprüfe die Filterwerte auf Tippfehler')
  }

  let result = ''

  if (alternatives.length > 0) {
    result += `**Alternative Vorschläge:**\n${alternatives.join('\n')}\n\n`
  }

  if (suggestions.length > 0) {
    result += `**Mögliche Lösungen:**\n${suggestions.join('\n')}`
  } else {
    result += 'Versuche es mit anderen Suchkriterien oder einem anderen Zeitraum.'
  }

  return result
}

export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,!?/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const isConfirmationMessage = (text: string) => {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  return includesAny(normalized, [
    'ja',
    'jap',
    'jo',
    'yes',
    'ok',
    'okay',
    'klar',
    'bitte',
    'mach',
    'machs',
    'machs bitte',
    'bitte eintragen',
    'ja bitte',
    'ja füge',
    'füge das',
    'füge hinzu',
    'einfügen',
    'erstellen',
    'anlegen',
    'hinzufügen',
  ])
}

export const normalizeInsertPayload = (payload: Record<string, any>) => {
  if (payload.tableName && payload.values && typeof payload.values === 'object') {
    return {
      tableName: payload.tableName,
      values: payload.values,
    }
  }

  return {
    tableName: payload.tableName,
    values: payload,
  }
}

export const extractInsertPayload = (content: string) => {
  // Try explicit INSERT_PAYLOAD markers first
  const codeBlockMatch = content.match(/```json\s*INSERT_PAYLOAD\s*([\s\S]*?)```/i)
  const inlineMatch = content.match(/INSERT_PAYLOAD:\s*({[\s\S]*?})/i)
  const rawJson = codeBlockMatch?.[1] ?? inlineMatch?.[1]

  if (rawJson) {
    try {
      const payload = JSON.parse(rawJson.trim())
      if (!payload || typeof payload !== 'object') {
        return null
      }
      return normalizeInsertPayload(payload)
    } catch (error) {
      console.error('Failed to parse INSERT_PAYLOAD JSON:', error)
      return null
    }
  }

  // Try to find JSON objects that look like insert payloads
  // Look for objects with tableName or common table field names
  const candidates: string[] = []
  let depth = 0
  let startIndex = -1
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '{') {
      if (depth === 0) {
        startIndex = i
      }
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0 && startIndex !== -1) {
        candidates.push(content.slice(startIndex, i + 1))
        startIndex = -1
      }
    }
  }

  // Try to find the most likely insert payload
  // Prefer objects that have tableName or common project fields
  for (const candidate of candidates) {
    try {
      const payload = JSON.parse(candidate.trim())
      if (payload && typeof payload === 'object') {
        // Check if this looks like an insert payload
        const hasTableName = 'tableName' in payload
        const hasProjectFields = 'project_code' in payload || 'name' in payload || 'project_date' in payload
        const hasValues = 'values' in payload

        if (hasTableName || (hasProjectFields && !hasValues)) {
          return normalizeInsertPayload(payload)
        }

        // If it has values object, it might be the payload structure
        if (hasValues && typeof payload.values === 'object') {
          return normalizeInsertPayload(payload)
        }

        // Last resort: if it looks like project data, try it
        if (hasProjectFields) {
          return normalizeInsertPayload(payload)
        }
      }
    } catch (error) {
      continue
    }
  }

  return null
}

export const inferInsertTable = (text: string) => {
  const match = text.match(/\bt_[a-z0-9_]+\b/i)
  if (!match) {
    return null
  }

  const table = match[0]
  return INSERT_ALLOWED_TABLES.has(table) ? table : null
}

export const inferProjectName = (userText: string) => {
  const normalized = normalizeText(userText)
  if (!normalized) return null

  const stopWords = new Set([
    'heute',
    'morgen',
    'gestern',
    'woche',
    'monat',
    'jetzt',
    'now',
    'diese',
    'dieser',
    'dieses',
    'nächste',
    'naechste',
    'nächsten',
    'naechsten',
    'letzte',
    'letzten',
    'letzter',
    'aktuelle',
    'aktuellen',
    'aktuell',
    'kommende',
    'kommenden',
  ])

  if (normalized.includes('projekt ')) {
    const afterProject = normalized.split('projekt ')[1]
    if (!afterProject) return null
    const tokens = afterProject.split(' ')
    const collected: string[] = []
    for (const token of tokens) {
      if (stopWords.has(token) || ['am', 'im', 'in', 'für', 'mit', 'vom', 'von', 'der', 'die', 'das'].includes(token)) {
        break
      }
      collected.push(token)
    }
    return collected.length ? collected.join(' ') : null
  }

  const tokens = normalized.split(' ').filter(Boolean)
  if (tokens.length <= 2 && tokens.every((token) => !stopWords.has(token))) {
    return tokens.join(' ')
  }

  return null
}

export const inferProjectIdentifier = (userText: string) => {
  const normalized = normalizeText(userText)
  if (!normalized) return null

  const uuidMatch = normalized.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  )
  const codeMatch = normalized.match(/\bprj-[0-9]{8}-[a-z0-9]{4,}\b/i)

  const name = inferProjectName(normalized)

  if (!uuidMatch && !codeMatch && !name) {
    return null
  }

  return {
    projectId: uuidMatch ? uuidMatch[0] : null,
    projectCode: codeMatch ? codeMatch[0].toUpperCase() : null,
    projectName: name,
  }
}

export const inferDateRange = ({
  userText,
  weekStart,
  weekEnd,
  berlinDateUtc,
}: {
  userText: string
  weekStart: Date
  weekEnd: Date
  berlinDateUtc: Date
}): DateRange | null => {
  const text = userText.toLowerCase()
  const hasWeek = text.includes('woche') || text.includes('week')
  const hasMonth = text.includes('monat') || text.includes('month')

  if (!hasWeek && !hasMonth) {
    return null
  }

  if (hasMonth) {
    const year = berlinDateUtc.getUTCFullYear()
    const month = berlinDateUtc.getUTCMonth()
    const currentStart = new Date(Date.UTC(year, month, 1))
    const currentEnd = new Date(Date.UTC(year, month + 1, 0))
    const nextStart = new Date(Date.UTC(year, month + 1, 1))
    const nextEnd = new Date(Date.UTC(year, month + 2, 0))
    const previousStart = new Date(Date.UTC(year, month - 1, 1))
    const previousEnd = new Date(Date.UTC(year, month, 0))

    if (includesAny(text, ['nächsten monat', 'naechsten monat', 'kommenden monat'])) {
      return { start: formatIsoDate(nextStart), end: formatIsoDate(nextEnd) }
    }

    if (includesAny(text, ['letzten monat', 'vorigen monat', 'vergangenen monat'])) {
      return { start: formatIsoDate(previousStart), end: formatIsoDate(previousEnd) }
    }

    if (includesAny(text, ['diesen monat', 'aktuellen monat', 'aktuell', 'jetzt', 'now'])) {
      return { start: formatIsoDate(currentStart), end: formatIsoDate(currentEnd) }
    }
  }

  if (hasWeek) {
    const currentStart = weekStart
    const currentEnd = weekEnd
    const previousStart = new Date(weekStart)
    previousStart.setUTCDate(previousStart.getUTCDate() - 7)
    const previousEnd = new Date(weekEnd)
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 7)
    const nextStart = new Date(weekStart)
    nextStart.setUTCDate(nextStart.getUTCDate() + 7)
    const nextEnd = new Date(weekEnd)
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 7)

    if (includesAny(text, ['nächste woche', 'naechste woche', 'kommende woche'])) {
      return { start: formatIsoDate(nextStart), end: formatIsoDate(nextEnd) }
    }

    if (includesAny(text, ['letzte woche', 'vorige woche', 'vergangene woche'])) {
      return { start: formatIsoDate(previousStart), end: formatIsoDate(previousEnd) }
    }

    if (includesAny(text, ['diese woche', 'aktuelle woche', 'kalenderwoche', 'jetzt', 'now'])) {
      return { start: formatIsoDate(currentStart), end: formatIsoDate(currentEnd) }
    }
  }

  return null
}

export const applyDateRangeFilters = (
  tableName: string,
  filters: Record<string, any>,
  dateRange: DateRange | null,
  userText?: string
) => {
  const dateField = DATE_RANGE_TABLE_FIELDS[tableName]
  if (!dateField) {
    return filters
  }

  const lowerText = (userText || '').toLowerCase()

  // Get today's date in Berlin timezone
  const today = new Date()
  const berlinIsoDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today)

  // Calculate tomorrow
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowIsoDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow)

  // Calculate yesterday
  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayIsoDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(yesterday)

  // Check for specific date keywords
  if (lowerText.includes('heute') || lowerText.includes('today')) {
    return {
      ...filters,
      [dateField]: {
        type: 'eq',
        value: berlinIsoDate,
      },
    }
  }

  if (lowerText.includes('morgen') || lowerText.includes('tomorrow')) {
    return {
      ...filters,
      [dateField]: {
        type: 'eq',
        value: tomorrowIsoDate,
      },
    }
  }

  if (lowerText.includes('gestern') || lowerText.includes('yesterday')) {
    return {
      ...filters,
      [dateField]: {
        type: 'eq',
        value: yesterdayIsoDate,
      },
    }
  }

  // Check if user is asking for future dates
  const isFutureQuery = lowerText.includes('zukünftig') ||
    lowerText.includes('nächste') ||
    lowerText.includes('nächster') ||
    lowerText.includes('noch nicht erledigt') ||
    lowerText.includes('kommend') ||
    (lowerText.includes('einsatz') && (lowerText.includes('nächste') || lowerText.includes('zukünftig')))

  if (isFutureQuery && !dateRange) {
    // Add automatic future date filter
    return {
      ...filters,
      [dateField]: {
        type: 'gte',
        value: berlinIsoDate,
      },
    }
  }

  if (dateRange) {
    return {
      ...filters,
      [dateField]: {
        type: 'between',
        value: [dateRange.start, dateRange.end],
      },
    }
  }

  return filters
}

/**
 * Apply intelligent employee name filters with fuzzy matching
 * Automatically uses ilike for employee name searches to find employees even with partial matches
 */
export const applyEmployeeFilters = (
  tableName: string,
  filters: Record<string, any>
): Record<string, any> => {
  // Only apply to employee-related tables
  if (tableName !== 't_employees' && tableName !== 'v_employee_kpi') {
    return filters
  }

  // If there's a 'name' filter, convert it to ilike for fuzzy matching
  if (filters.name) {
    // If it's already an object with type, don't override
    if (typeof filters.name === 'object' && filters.name !== null && 'type' in filters.name) {
      return filters
    }

    // If it's a string, convert to ilike for case-insensitive partial matching
    if (typeof filters.name === 'string') {
      return {
        ...filters,
        name: {
          type: 'ilike',
          value: filters.name,
        },
      }
    }
  }

  return filters
}

/**
 * Extract conversation context from recent messages
 * Tracks: last project (name + date), last action, last filters
 */
export interface ConversationContext {
  lastProject?: {
    name: string
    date?: string
    code?: string
  }
  lastAction?: {
    type: 'query' | 'insert' | 'update' | 'delete' | 'statistics'
    table?: string
    description?: string
  }
  lastFilters?: {
    dateRange?: DateRange | null
    projectName?: string
    employeeName?: string
  }
}

export const extractConversationContext = (messages: any[]): ConversationContext => {
  const context: ConversationContext = {}

  // Look at last 15 messages (user + assistant + tool pairs)
  const recentMessages = messages.slice(-15)

  // Extract last project mentioned from user messages and tool results
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i]
    const content = msg?.content || ''

    // Look for project mentions with dates in user messages
    const projectDateMatch = content.match(/projekt\s+([^,\n]+?)\s+(?:am|für|für den)\s+(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/i)
    if (projectDateMatch && msg?.role === 'user') {
      context.lastProject = {
        name: projectDateMatch[1].trim(),
        date: `${projectDateMatch[4]}-${projectDateMatch[3].padStart(2, '0')}-${projectDateMatch[2].padStart(2, '0')}`
      }
      break
    }

    // Look for project mentions without dates in user messages
    const projectMatch = content.match(/projekt\s+([^,\n]+?)(?:\s|$|,|\.)/i)
    if (projectMatch && msg?.role === 'user' && !context.lastProject) {
      const projectName = projectMatch[1].trim()
      // Skip common words that aren't project names
      if (!['alle', 'heute', 'morgen', 'gestern', 'diese', 'nächste', 'letzte'].includes(projectName.toLowerCase())) {
        context.lastProject = {
          name: projectName
        }
      }
    }

    // Extract project from tool call arguments (e.g., insertRow with project_name)
    if (msg?.role === 'assistant' && msg?.tool_calls) {
      for (const toolCall of msg.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function?.arguments || '{}')
          if (args.tableName === 't_projects' && args.values?.name) {
            context.lastProject = {
              name: args.values.name,
              date: args.values.project_date || args.values.plan_date
            }
            break
          }
          // Extract from filters
          if (args.filters?.project_name || args.filters?.name) {
            const projectName = args.filters.project_name || args.filters.name
            if (typeof projectName === 'string' && !context.lastProject) {
              context.lastProject = {
                name: projectName,
                date: args.filters.plan_date || args.filters.project_date
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      if (context.lastProject) break
    }

    // Extract project from tool results (JSON responses)
    if (msg?.role === 'tool' && content) {
      try {
        const toolResult = JSON.parse(content)
        if (toolResult.data && Array.isArray(toolResult.data) && toolResult.data.length > 0) {
          const firstResult = toolResult.data[0]
          if (firstResult.project_name || firstResult.name) {
            const projectName = firstResult.project_name || firstResult.name
            if (!context.lastProject && typeof projectName === 'string') {
              context.lastProject = {
                name: projectName,
                date: firstResult.plan_date || firstResult.project_date,
                code: firstResult.project_code
              }
            }
          }
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }

  // Extract last action from tool calls
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i]
    if (msg?.role === 'assistant' && msg?.tool_calls) {
      const lastToolCall = msg.tool_calls[msg.tool_calls.length - 1]
      if (lastToolCall?.function?.name) {
        const toolName = lastToolCall.function.name
        try {
          const args = JSON.parse(lastToolCall.function.arguments || '{}')
          context.lastAction = {
            type: toolName === 'queryTable' || toolName === 'queryTableWithJoin' ? 'query' :
              toolName === 'insertRow' ? 'insert' :
                toolName === 'updateRow' ? 'update' :
                  toolName === 'deleteRow' ? 'delete' :
                    toolName === 'getStatistics' ? 'statistics' : 'query',
            table: args.tableName
          }
        } catch (e) {
          context.lastAction = {
            type: toolName === 'queryTable' || toolName === 'queryTableWithJoin' ? 'query' :
              toolName === 'insertRow' ? 'insert' :
                toolName === 'updateRow' ? 'update' :
                  toolName === 'deleteRow' ? 'delete' :
                    toolName === 'getStatistics' ? 'statistics' : 'query'
          }
        }
        break
      }
    }
  }

  return context
}

export const applyProjectFilters = (
  tableName: string,
  filters: Record<string, any>,
  projectIdentifiers: { projectId: string | null; projectCode: string | null; projectName: string | null } | null
) => {
  if (!projectIdentifiers) {
    return filters
  }

  const fields = PROJECT_FILTER_FIELDS[tableName]
  if (!fields) {
    return filters
  }

  let nextFilters = { ...filters }

  if (projectIdentifiers.projectId && fields.id && !nextFilters[fields.id]) {
    nextFilters = {
      ...nextFilters,
      [fields.id]: { type: 'eq', value: projectIdentifiers.projectId },
    }
  }

  if (projectIdentifiers.projectCode && fields.code && !nextFilters[fields.code]) {
    nextFilters = {
      ...nextFilters,
      [fields.code]: { type: 'eq', value: projectIdentifiers.projectCode },
    }
  }

  if (projectIdentifiers.projectName && fields.name && !nextFilters[fields.name]) {
    nextFilters = {
      ...nextFilters,
      [fields.name]: { type: 'ilike', value: projectIdentifiers.projectName },
    }
  }

  return nextFilters
}
