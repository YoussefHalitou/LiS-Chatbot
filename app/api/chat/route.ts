import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  queryTable,
  insertRow,
  updateRow,
  deleteRow,
} from '@/lib/supabase-query'
import { INSERT_ALLOWED_TABLES } from '@/lib/constants'
import { rateLimitMiddleware, getClientIdentifier } from '@/lib/rate-limit'
import { authenticateRequest } from '@/lib/auth-middleware'
import { checkPermission, getPermissionDeniedMessage } from '@/lib/rbac'
import { createRequestLogger } from '@/lib/logger'
import type { ChatRequest } from '@/types'

// Extracted modules
import { SYSTEM_PROMPT, buildSystemPrompt } from '@/lib/chat/system-prompt'
import {
  DateRange,
  formatIsoDate,
  formatJsonOutput,
  formatErrorMessage,
  isConfirmationMessage,
  extractInsertPayload,
  inferInsertTable,
  inferProjectIdentifier,
  inferDateRange,
  extractConversationContext,
} from '@/lib/chat/inference'
import { getToolDefinitions } from '@/lib/chat/tool-definitions'
import { handleToolCalls, NO_CACHE_HEADERS } from '@/lib/chat/tool-handlers'
import { handleStreamingCompletion, setOpenAIClientGetter } from '@/lib/chat/streaming'

// Initialize OpenAI client lazily to avoid build errors when env var is missing
let openai: OpenAI | null = null


function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

// Register OpenAI client getter for streaming module
setOpenAIClientGetter(getOpenAIClient)

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const correlationId = req.headers.get('x-correlation-id') || undefined
  const log = createRequestLogger(requestId, correlationId, { route: '/api/chat' })

  // Authenticate request
  const { user: authUser, role: userRole, error: authError } = await authenticateRequest(req)
  if (authError) return authError

  log.info({ userId: authUser?.id, role: userRole }, 'Chat API called')

  // Apply rate limiting (use authenticated user ID for accurate per-user limiting)
  const rateLimitResult = await rateLimitMiddleware(req, '/api/chat', authUser?.id)
  if (!rateLimitResult.allowed) {
    log.warn({ userId: authUser?.id }, 'Rate limit hit')
    return rateLimitResult.response!
  }

  try {
    const body: ChatRequest = await req.json()
    const { messages, chatId } = body
    log.debug({ messageCount: messages?.length, hasChatId: !!chatId }, 'Request body parsed')

    if (!messages || !Array.isArray(messages)) {
      log.warn('Invalid messages array')
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Chat ID is optional - can be used for future Supabase chat persistence
    if (chatId) {
      log.debug({ chatId }, 'Chat ID received')
    }

    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === 'user')?.content || ''
    const lastAssistantMessage =
      [...messages].reverse().find((message) => message.role === 'assistant')?.content || ''

    // Check for recent insertRow, updateRow, or deleteRow tool calls in message history

    // Helper to check if a tool call was already executed (success message exists after it)
    const wasToolCallExecuted = (toolCallMessage: any, successPatterns: string[]): boolean => {
      if (!toolCallMessage) return false
      const toolCallIndex = messages.indexOf(toolCallMessage)
      if (toolCallIndex === -1) return false

      // Check if there's an assistant message AFTER the tool call that contains a success indicator
      for (let i = toolCallIndex + 1; i < messages.length; i++) {
        const msg = messages[i]
        if (msg.role === 'assistant' && msg.content) {
          const content = msg.content.toLowerCase()
          if (successPatterns.some(pattern => content.includes(pattern.toLowerCase()))) {
            return true
          }
        }
      }
      return false
    }

    const recentInsertToolCall = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant' || !message.tool_calls) return false
        return message.tool_calls.some(
          (tc: any) => tc.function?.name === 'insertRow'
        )
      })

    const recentUpdateToolCall = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant' || !message.tool_calls) return false
        return message.tool_calls.some(
          (tc: any) => tc.function?.name === 'updateRow'
        )
      })

    const recentDeleteToolCall = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant' || !message.tool_calls) return false
        return message.tool_calls.some(
          (tc: any) => tc.function?.name === 'deleteRow'
        )
      })

    log.debug({ isConfirmation: isConfirmationMessage(lastUserMessage), hasInsertToolCall: !!recentInsertToolCall, hasUpdateToolCall: !!recentUpdateToolCall, hasDeleteToolCall: !!recentDeleteToolCall }, 'Checking confirmation')
    if (isConfirmationMessage(lastUserMessage)) {
      // Check if all pending tool calls are already executed
      const deleteAlreadyExecuted = wasToolCallExecuted(recentDeleteToolCall, ['erfolgreich gelöscht', 'wurde gelöscht', 'entfernt'])
      const updateAlreadyExecuted = wasToolCallExecuted(recentUpdateToolCall, ['erfolgreich aktualisiert', 'wurde aktualisiert', 'geändert'])
      const insertAlreadyExecuted = wasToolCallExecuted(recentInsertToolCall, ['erfolgreich erstellt', 'erfolgreich angelegt', 'wurde erstellt'])

      // If there are tool calls but ALL are already executed, skip confirmation handling
      // This prevents re-execution loops when user says "ja" to "Soll ich dir die Details anzeigen?"
      const hasAnyToolCall = !!(recentDeleteToolCall || recentUpdateToolCall || recentInsertToolCall)
      const allAlreadyExecuted =
        (!recentDeleteToolCall || deleteAlreadyExecuted) &&
        (!recentUpdateToolCall || updateAlreadyExecuted) &&
        (!recentInsertToolCall || insertAlreadyExecuted)

      if (hasAnyToolCall && allAlreadyExecuted) {
        log.debug('All tool calls already executed, skipping confirmation')
        // User said "ja" after success - likely wants to see details
        // Return early with a message to avoid OpenAI generating new tool calls
        // If there was an insert, try to show the created entry
        if (insertAlreadyExecuted && recentInsertToolCall?.tool_calls) {
          const insertToolCall = recentInsertToolCall.tool_calls.find(
            (tc: any) => tc.function?.name === 'insertRow'
          )
          if (insertToolCall) {
            try {
              const functionArgs = JSON.parse(insertToolCall.function.arguments || '{}')
              const tableName = functionArgs.tableName
              // Extract the name from conversation to query
              const userMessages = messages
                .filter((m: any) => m.role === 'user')
                .map((m: any) => m.content)
                .join(' ')
              const nameMatch = userMessages.match(/(?:namens?|projekt|genannt|name)\s*['"´`]([^'"´`]+)['"´`]/i) ||
                userMessages.match(/(?:neues?\s+projekt|erstelle.*projekt)\s+(\w+)/i)

              if (tableName && nameMatch) {
                const { queryTable } = await import('@/lib/supabase-query')
                const queryResult = await queryTable(tableName, { name: nameMatch[1].trim() }, 1)
                if (queryResult.data && queryResult.data.length > 0) {
                  const entry = queryResult.data[0]
                  const detailLines = Object.entries(entry)
                    .filter(([key, value]) => value !== null && !key.includes('created_at') && !key.includes('updated_at'))
                    .map(([key, value]) => `- **${key}**: ${value}`)
                    .join('\n')
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: `Hier sind die Details des erstellten Eintrags:\n\n${detailLines}`,
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }
              }
            } catch (e) {
              // Fall through to generic response
            }
          }
        }
        // Generic response when we can't show details
        return NextResponse.json(
          {
            message: {
              role: 'assistant',
              content: 'Der Vorgang wurde bereits erfolgreich abgeschlossen. Wie kann ich dir weiter helfen?',
            },
          },
          { headers: NO_CACHE_HEADERS }
        )
      } else {
        log.info('Confirmation detected, processing pending tool calls')
        // Priority: delete > update > insert
        // First, check for delete confirmation
        if (recentDeleteToolCall?.tool_calls && !deleteAlreadyExecuted) {
          const deleteToolCall = recentDeleteToolCall.tool_calls.find(
            (tc: any) => tc.function?.name === 'deleteRow'
          )
          if (deleteToolCall) {
            try {
              const functionArgs = JSON.parse(deleteToolCall.function.arguments || '{}')
              if (functionArgs.tableName && functionArgs.filters) {
                if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: `Löschung nicht möglich: Tabelle "${functionArgs.tableName}" ist nicht erlaubt.`,
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }

                log.info({ table: functionArgs.tableName, filters: functionArgs.filters }, 'Re-executing delete from tool call')
                const clientId = getClientIdentifier(req)
                const deleteResult = await deleteRow(functionArgs.tableName, functionArgs.filters, {
                  ipAddress: clientId,
                  requireSingleRow: true,
                })

                if (deleteResult.error) {
                  log.error({ error: deleteResult.error }, 'Delete failed')
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: formatErrorMessage(deleteResult.error, 'der Löschung'),
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }

                const deletedCount = deleteResult.data?.deleted_count || 0
                // Return immediately - don't check for update/insert if delete was found
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: deletedCount > 0
                        ? `Der Eintrag wurde erfolgreich gelöscht. ${deletedCount} Zeile(n) wurden entfernt.`
                        : 'Keine Zeilen wurden gelöscht. Möglicherweise existiert der Eintrag nicht mehr.',
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }
            } catch (error) {
              log.error({ error }, 'Error parsing delete tool call arguments')
            }
            // Return here to prevent checking update/insert if delete was attempted
            return
          }
        }

        // Then, check for update confirmation
        if (recentUpdateToolCall?.tool_calls && !updateAlreadyExecuted) {
          const updateToolCall = recentUpdateToolCall.tool_calls.find(
            (tc: any) => tc.function?.name === 'updateRow'
          )
          if (updateToolCall) {
            try {
              const functionArgs = JSON.parse(updateToolCall.function.arguments || '{}')
              if (functionArgs.tableName && functionArgs.filters && functionArgs.values) {
                if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: `Update nicht möglich: Tabelle "${functionArgs.tableName}" ist nicht erlaubt.`,
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }

                log.info({ table: functionArgs.tableName, filters: functionArgs.filters }, 'Re-executing update from tool call')
                const clientId = getClientIdentifier(req)
                const updateResult = await updateRow(
                  functionArgs.tableName,
                  functionArgs.filters,
                  functionArgs.values,
                  {
                    requireSingleRow: true,
                  }
                )

                if (updateResult.error) {
                  log.error({ error: updateResult.error }, 'Update failed')
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: formatErrorMessage(updateResult.error, 'der Aktualisierung'),
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }

                // Return immediately - don't check for insert if update was found
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: 'Der Eintrag wurde erfolgreich aktualisiert.',
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }
            } catch (error) {
              log.error({ error }, 'Error parsing update tool call arguments')
            }
            // Return here to prevent checking insert if update was attempted
            return
          }
        }

        // Finally, try to use a recent insert tool call if available

        if (recentInsertToolCall?.tool_calls && !insertAlreadyExecuted) {
          const insertToolCall = recentInsertToolCall.tool_calls.find(
            (tc: any) => tc.function?.name === 'insertRow'
          )

          if (insertToolCall) {
            try {

              const functionArgs = JSON.parse(insertToolCall.function.arguments || '{}')
              log.debug({ tableName: functionArgs.tableName, valueKeys: Object.keys(functionArgs.values || {}) }, 'Parsed insert arguments')

              // FALLBACK: If AI didn't include values, try to extract from conversation
              if (functionArgs.tableName && !functionArgs.values) {
                log.debug({ tableName: functionArgs.tableName }, 'Values missing, attempting fallback extraction')

                // Get all user messages to extract values
                const userMessages = messages
                  .filter((m: any) => m.role === 'user')
                  .map((m: any) => m.content)
                  .join(' ');

                if (functionArgs.tableName === 't_projects') {
                  // Extract project name from various patterns
                  // Priority: quoted names > "namens X" > "Projekt X"
                  const nameMatch =
                    // Quoted: namens 'X', name "X", genannt 'X'
                    userMessages.match(/(?:namens?|genannt|name)\s*['"´`]([^'"´`]+)['"´`]/i) ||
                    // Unquoted: namens X, namens XYZ123
                    userMessages.match(/namens\s+([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
                    // Pattern: erstelle Projekt X, neues Projekt X
                    userMessages.match(/(?:erstelle|neues?)\s+(?:ein\s+)?(?:neues\s+)?Projekt\s+(?:namens\s+)?([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
                    // Simple: Projekt X (but not "Projekt namens")
                    userMessages.match(/Projekt\s+(?!namens)([A-Za-z0-9äöüÄÖÜß_-]+)/i);
                  // Extract city from patterns like "in München", "in Berlin"
                  const cityMatch = userMessages.match(/\bin\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\b/);

                  if (nameMatch) {
                    // Only include columns that are guaranteed to exist
                    // Note: 'stadt' column may not exist in the actual database schema
                    functionArgs.values = {
                      name: nameMatch[1].trim(),
                      status: 'In Planung'
                    };
                    log.info({ extractedValues: functionArgs.values }, 'Extracted values from conversation')
                  }
                } else if (functionArgs.tableName === 't_employees') {
                  // Extract employee name - handle various patterns
                  const nameMatch =
                    // Quoted: namens 'X', name "X"
                    userMessages.match(/(?:namens?|genannt|name)\s*['"´`]([^'"´`]+)['"´`]/i) ||
                    // Unquoted with namens: Mitarbeiter namens X
                    userMessages.match(/(?:mitarbeiter|arbeiter|worker)\s+namens\s+([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
                    // Direct: neuer Mitarbeiter X (where X is not "namens")
                    userMessages.match(/(?:neuer?|neu)\s+(?:mitarbeiter|arbeiter|worker)\s+(?!namens)([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
                    // Simple: Mitarbeiter X (where X is not "namens" or "neu")
                    userMessages.match(/(?:mitarbeiter|arbeiter|worker)\s+(?!namens|neu)([A-Za-z0-9äöüÄÖÜß_-]+)/i);
                  if (nameMatch) {
                    functionArgs.values = {
                      name: nameMatch[1].trim(),
                      is_active: true
                    };
                  }
                }
              }

              if (functionArgs.tableName && functionArgs.values) {
                // Re-execute the insert with confirm: true

                if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: `Eintrag nicht möglich: Tabelle "${functionArgs.tableName}" ist nicht erlaubt.`,
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }

                log.info({ table: functionArgs.tableName }, 'Re-executing insert from tool call')
                const clientId = getClientIdentifier(req)
                const insertResult = await insertRow(functionArgs.tableName, functionArgs.values, {
                  ipAddress: clientId,
                })
                log.debug({ hasError: !!insertResult.error, hasData: !!insertResult.data }, 'Insert result received')

                if (insertResult.error) {
                  log.error({ error: insertResult.error }, 'Insert failed')
                  return NextResponse.json(
                    {
                      message: {
                        role: 'assistant',
                        content: formatErrorMessage(insertResult.error, 'der Erstellung'),
                      },
                    },
                    { headers: NO_CACHE_HEADERS }
                  )
                }

                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: 'Der Eintrag wurde erfolgreich erstellt. Soll ich dir die Details anzeigen?',
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }
            } catch (error) {
              log.error({ error }, 'Error parsing tool call arguments')
            }
          }
        } else if (recentInsertToolCall?.tool_calls && insertAlreadyExecuted) {
          // Tool call was already executed - don't re-execute or fall through to OpenAI
          // Return early to prevent loop behavior
          // The user is likely responding to "Soll ich dir die Details anzeigen?" with "ja"
          // We should acknowledge and not try to create again
          // Skip confirmation handling entirely - let the request go to OpenAI without confirmation logic
        }

        // Fallback to extracting from assistant message text
        if (lastAssistantMessage) {
          const insertPayload = extractInsertPayload(lastAssistantMessage)
          const inferredTable =
            insertPayload?.tableName ||
            inferInsertTable(lastAssistantMessage) ||
            inferInsertTable(lastUserMessage)

          // Handle case where payload has values nested
          let insertValues = insertPayload?.values

          // If payload itself looks like values (has project fields but no tableName/values wrapper)
          if (!insertValues && insertPayload && !insertPayload.tableName) {
            // Check if the payload itself is the values object
            if ('project_code' in insertPayload || 'name' in insertPayload) {
              insertValues = insertPayload
            }
          }

          // If we have a table but no values, try to extract from the payload
          if (inferredTable && !insertValues && insertPayload) {
            // If payload has the values directly (not nested)
            if (!insertPayload.tableName && !insertPayload.values) {
              insertValues = insertPayload
            }
          }

          if (inferredTable && insertValues) {
            if (!INSERT_ALLOWED_TABLES.has(inferredTable)) {
              return NextResponse.json(
                {
                  message: {
                    role: 'assistant',
                    content: `Eintrag nicht möglich: Tabelle "${inferredTable}" ist nicht erlaubt.`,
                  },
                },
                { headers: NO_CACHE_HEADERS }
              )
            }

            log.info({ table: inferredTable }, 'Attempting insert from extracted payload')
            const clientId = getClientIdentifier(req)
            const insertResult = await insertRow(inferredTable, insertValues, {
              ipAddress: clientId,
            })

            if (insertResult.error) {
              log.error({ error: insertResult.error }, 'Insert failed')
              return NextResponse.json(
                {
                  message: {
                    role: 'assistant',
                    content: formatErrorMessage(insertResult.error, 'der Erstellung'),
                  },
                },
                { headers: NO_CACHE_HEADERS }
              )
            }

            return NextResponse.json(
              {
                message: {
                  role: 'assistant',
                  content: 'Der Eintrag wurde erfolgreich erstellt. Soll ich dir die Details anzeigen?',
                },
              },
              { headers: NO_CACHE_HEADERS }
            )
          }

          // If we have payload but missing table or values, provide helpful error
          if (insertPayload || inferredTable) {
            log.warn({ hasPayload: !!insertPayload, hasTable: !!inferredTable, hasValues: !!insertValues }, 'Insert attempt failed — incomplete data')
            return NextResponse.json(
              {
                message: {
                  role: 'assistant',
                  content:
                    'Ich habe eine Bestätigung erhalten, aber konnte die Eintragsdaten nicht vollständig erkennen. Bitte versuche es erneut oder gib die Details explizit an.',
                },
              },
              { headers: NO_CACHE_HEADERS }
            )
          }
        }
      } // end else block for tool call handling
    }

    const now = new Date()
    const berlinTime = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)

    const berlinIsoDateForCalc = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const [year, month, day] = berlinIsoDateForCalc.split('-').map(Number)
    const berlinDateUtc = new Date(Date.UTC(year, month - 1, day))
    const dayOfWeek = berlinDateUtc.getUTCDay()
    const daysSinceMonday = (dayOfWeek + 6) % 7

    const weekStart = new Date(berlinDateUtc)
    weekStart.setUTCDate(berlinDateUtc.getUTCDate() - daysSinceMonday)

    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)

    const berlinWeekRange = `${formatIsoDate(weekStart)} bis ${formatIsoDate(weekEnd)}`

    const berlinIsoDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const berlinIsoDateTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now)

    const berlinIsoDateTimeWithOffset = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'shortOffset',
      hour12: false,
    }).format(now)

    // Extract conversation context from recent messages
    const conversationContext = extractConversationContext(messages)

    // Build context string for system prompt
    let contextInfo = ''
    if (conversationContext.lastProject) {
      contextInfo += `\n**KONVERSATIONS-KONTEXT:**\n`
      contextInfo += `- **Letztes Projekt:** ${conversationContext.lastProject.name}`
      if (conversationContext.lastProject.date) {
        contextInfo += ` (Datum: ${conversationContext.lastProject.date})`
      }
      if (conversationContext.lastProject.code) {
        contextInfo += ` (Code: ${conversationContext.lastProject.code})`
      }
      contextInfo += `\n`
      contextInfo += `- **WICHTIG**: Wenn der Nutzer in der aktuellen Nachricht kein explizites Projekt erwähnt, verwende automatisch das letzte Projekt (${conversationContext.lastProject.name}${conversationContext.lastProject.date ? ` am ${conversationContext.lastProject.date}` : ''}) als Kontext.\n`
      contextInfo += `- **Beispiel**: Wenn der Nutzer sagt "füge Mitarbeiter hinzu" ohne Projekt zu nennen, verwende automatisch "${conversationContext.lastProject.name}" als Projekt.\n`
    }
    if (conversationContext.lastAction) {
      contextInfo += `- **Letzte Aktion:** ${conversationContext.lastAction.type}${conversationContext.lastAction.table ? ` auf Tabelle ${conversationContext.lastAction.table}` : ''}\n`
    }

    const systemPromptWithTime = `${SYSTEM_PROMPT}${contextInfo}\n\nAKTUELLE SYSTEMZEIT:\n- ISO (UTC): ${now.toISOString()}\n- Europa/Berlin: ${berlinTime}\n- Berlin (ISO-ähnlich, Datum): ${berlinIsoDate}\n- Berlin (ISO-ähnlich, Datum+Zeit 24h): ${berlinIsoDateTime}\n- Berlin (ISO-Offset): ${berlinIsoDateTimeWithOffset}\n- Aktuelle Kalenderwoche (Mo-So, Berlin): ${berlinWeekRange}\n- HEUTE (für Filter): ${berlinIsoDate}\n\nNutze diese Angaben direkt, wenn nach dem aktuellen Datum oder der aktuellen Uhrzeit gefragt wird. Berechne relative Zeitangaben (z.B. gestern, morgen, übermorgen, letzte Woche, nächste Woche) ausschließlich auf Basis der Berlin-Zeit und filtere Woche/"Kalenderwoche"-Anfragen strikt auf ${berlinWeekRange}.\n\n**WICHTIG FÜR ZUKUNFTSFILTER**: Wenn der Nutzer nach "zukünftigen", "nächsten", "noch nicht erledigten" Projekten/Einsätzen fragt, verwende IMMER einen Filter mit plan_date >= '${berlinIsoDate}' oder project_date >= '${berlinIsoDate}'. Nur Datensätze mit Datum >= ${berlinIsoDate} sind zukünftig!`

    // Prepare messages for OpenAI
    const openaiMessages: any[] = [
      {
        role: 'system',
        content: systemPromptWithTime,
      },
    ]

    // Add user messages and assistant responses
    // Track tool calls and their responses to ensure proper message structure
    const toolResponses = new Map<string, any>()

    // First pass: collect tool responses
    for (const message of messages) {
      if (message.role === 'tool' && message.tool_call_id) {
        toolResponses.set(message.tool_call_id, {
          role: 'tool',
          tool_call_id: message.tool_call_id,
          content: message.content,
        })
      }
    }

    // Second pass: build OpenAI messages with proper tool call structure
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const openaiMessage: any = {
        role: message.role,
        content: message.content,
      }

      // For assistant messages with tool_calls, only include them if we have all tool responses
      if (message.role === 'assistant' && message.tool_calls) {
        const allToolCallsHaveResponses = message.tool_calls.every((tc: any) =>
          toolResponses.has(tc.id)
        )

        if (allToolCallsHaveResponses) {
          // Include tool_calls and add tool response messages after
          openaiMessage.tool_calls = message.tool_calls
          openaiMessages.push(openaiMessage)

          // Add tool response messages for each tool call
          for (const toolCall of message.tool_calls) {
            const toolResponse = toolResponses.get(toolCall.id)
            if (toolResponse) {
              openaiMessages.push(toolResponse)
            }
          }
          continue
        } else {
          // Don't include tool_calls if we don't have all responses
          // This prevents the OpenAI API error - just send the message without tool_calls
        }
      }

      // For tool messages, skip them here (they're added after their corresponding assistant message above)
      if (message.role === 'tool') {
        continue
      }

      // Preserve tool call ID if present (for tool/function messages)
      if (message.tool_call_id) {
        openaiMessage.tool_call_id = message.tool_call_id
      }

      openaiMessages.push(openaiMessage)
    }

    const streamingDisabledEnv =
      process.env.CHAT_STREAMING_DISABLED === 'true' ||
      process.env.NEXT_PUBLIC_DISABLE_STREAMING === 'true'

    const streamingDisabledRequest =
      req.headers.get('x-disable-streaming') === 'true'

    const requestedDateRange = inferDateRange({
      userText: lastUserMessage,
      weekStart,
      weekEnd,
      berlinDateUtc,
    })
    const requestedProjectIdentifiers = inferProjectIdentifier(lastUserMessage)

    if (streamingDisabledEnv || streamingDisabledRequest) {
      return await handleNonStreamingCompletion(
        openaiMessages,
        requestedDateRange,
        requestedProjectIdentifiers,
        userRole
      )
    }

    return handleStreamingCompletion(
      openaiMessages,
      requestedDateRange,
      requestedProjectIdentifiers,
      userRole
    )
  } catch (error) {
    log.error({ error }, 'Chat API error')

    // Provide more detailed error information
    let errorMessage = 'Ein Fehler ist aufgetreten.'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      // Check for specific error types
      if (error.message.includes('API key') || error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API-Schlüssel fehlt oder ist ungültig. Bitte überprüfe deine Umgebungsvariablen.'
        statusCode = 401
      } else if (error.message.includes('Supabase') || error.message.includes('SUPABASE')) {
        errorMessage = 'Supabase-Konfiguration fehlt oder ist ungültig. Bitte überprüfe deine Umgebungsvariablen.'
        statusCode = 500
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = 'API-Kontingent überschritten. Bitte versuche es später erneut.'
        statusCode = 429
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: statusCode, headers: NO_CACHE_HEADERS }
    )
  }
}

async function handleNonStreamingCompletion(
  openaiMessages: any[],
  requestedDateRange: DateRange | null,
  requestedProjectIdentifiers: {
    projectId: string | null
    projectCode: string | null
    projectName: string | null
  } | null,
  userRole?: string | null
) {
  // Create a completion with tools (function calling) for database queries
  const completion = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    messages: openaiMessages,
    tools: getToolDefinitions(),
    tool_choice: 'auto',
    temperature: 0.3, // Lower temperature to reduce hallucinations and be more factual
  })

  const responseMessage = completion.choices[0].message

  // Check if the model wants to call a tool
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    // Get last user message for context
    const lastUserMsg = openaiMessages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || ''

    await handleToolCalls(
      responseMessage,
      openaiMessages,
      requestedDateRange,
      requestedProjectIdentifiers,
      lastUserMsg,
      userRole
    )

    // Get the final response from OpenAI after tool execution
    const finalCompletion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.3, // Lower temperature to reduce hallucinations and be more factual
    })

    const finalMessage = finalCompletion.choices[0].message

    return NextResponse.json(
      {
        message: {
          role: 'assistant',
          content: finalMessage.content || 'I processed your request, but got no response.',
        },
      },
      { headers: NO_CACHE_HEADERS }
    )
  }

  // Return the assistant's response
  return NextResponse.json(
    {
      message: {
        role: 'assistant',
        content: responseMessage.content,
      },
    },
    { headers: NO_CACHE_HEADERS }
  )
}
