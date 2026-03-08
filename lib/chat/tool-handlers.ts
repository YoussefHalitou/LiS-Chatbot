/**
 * Tool call execution handlers for the chat API.
 *
 * Processes OpenAI tool calls (queryTable, insertRow, updateRow,
 * deleteRow, etc.) and pushes results back into the messages array.
 */

import {
  queryTable,
  getTableNames,
  getTableStructure,
  queryTableWithJoin,
  insertRow,
  updateRow,
  deleteRow,
  getStatistics,
} from '@/lib/supabase-query'
import { INSERT_ALLOWED_TABLES } from '@/lib/constants'
import { checkPermission, getPermissionDeniedMessage } from '@/lib/rbac'
import type { DateRange } from './inference'
import {
  includesAny,
  formatJsonOutput,
  formatErrorMessage,
  getNoResultsSuggestions,
  isConfirmationMessage,
  normalizeInsertPayload,
  extractInsertPayload,
  inferInsertTable,
  applyDateRangeFilters,
  applyEmployeeFilters,
  applyProjectFilters,
  extractConversationContext,
} from './inference'

/**
 * Helper function to extract IDs from previous query results in the conversation
 * This helps when the bot finds IDs but doesn't pass them correctly to insertRow
 */
export function extractIdsFromPreviousQueries(
  openaiMessages: any[],
  projectName?: string,
  employeeName?: string,
  planDate?: string
): { plan_id?: string; employee_id?: string; project_id?: string } {
  const extractedIds: { plan_id?: string; employee_id?: string; project_id?: string } = {}

  // Look through recent tool responses for queryTable results
  // Go backwards through messages to find the most recent relevant queries
  for (let i = openaiMessages.length - 1; i >= 0; i--) {
    const message = openaiMessages[i]

    // Check tool responses
    if (message.role === 'tool' && message.content) {
      try {
        const toolResult = typeof message.content === 'string'
          ? JSON.parse(message.content)
          : message.content

        if (toolResult.data && Array.isArray(toolResult.data) && toolResult.data.length > 0) {
          const firstResult = toolResult.data[0]

          // Extract plan_id from v_morningplan_full or t_morningplan queries
          if (!extractedIds.plan_id && firstResult.plan_id) {
            // If project name and date match, use this plan_id
            if (projectName && planDate) {
              if (
                firstResult.project_name?.toLowerCase().includes(projectName.toLowerCase()) &&
                firstResult.plan_date === planDate
              ) {
                extractedIds.plan_id = firstResult.plan_id
              }
            } else if (projectName && firstResult.project_name?.toLowerCase().includes(projectName.toLowerCase())) {
              extractedIds.plan_id = firstResult.plan_id
            } else if (firstResult.plan_id) {
              // Use the most recent plan_id as fallback
              extractedIds.plan_id = firstResult.plan_id
            }
          }

          // Extract employee_id from t_employees queries
          if (!extractedIds.employee_id && firstResult.employee_id) {
            if (employeeName && firstResult.name?.toLowerCase().includes(employeeName.toLowerCase())) {
              extractedIds.employee_id = firstResult.employee_id
            } else if (firstResult.employee_id) {
              // Use the most recent employee_id as fallback
              extractedIds.employee_id = firstResult.employee_id
            }
          }

          // Extract project_id from t_projects or v_morningplan_full queries
          if (!extractedIds.project_id && firstResult.project_id) {
            if (projectName && firstResult.project_name?.toLowerCase().includes(projectName.toLowerCase())) {
              extractedIds.project_id = firstResult.project_id
            } else if (firstResult.project_id) {
              // Use the most recent project_id as fallback
              extractedIds.project_id = firstResult.project_id
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Stop if we found all IDs we might need
    if (extractedIds.plan_id && extractedIds.employee_id && extractedIds.project_id) {
      break
    }
  }

  return extractedIds
}

export async function handleToolCalls(
  responseMessage: any,
  openaiMessages: any[],
  requestedDateRange: DateRange | null,
  requestedProjectIdentifiers: {
    projectId: string | null
    projectCode: string | null
    projectName: string | null
  } | null,
  lastUserMessage?: string,
  userRole?: string | null
) {
  const content = responseMessage.content
  const lowerContent = content?.toLowerCase() || ''
  const isAnnouncement =
    content &&
    (lowerContent.includes('moment') ||
      lowerContent.includes('während ich') ||
      lowerContent.includes('i will') ||
      lowerContent.includes('let me') ||
      lowerContent.includes('ich werde') ||
      lowerContent.includes('ich versuche') ||
      lowerContent.includes("i'll") ||
      lowerContent.includes('ich bin bereit') ||
      lowerContent.includes("i'm ready") ||
      lowerContent.includes('i can help') ||
      lowerContent.includes('wie kann ich dir helfen') ||
      lowerContent.includes('was möchtest du wissen') ||
      lowerContent.includes('was möchtest du tun') ||
      lowerContent.includes('einen moment') ||
      lowerContent.includes('einen augenblick') ||
      lowerContent.includes('ich werde nun') ||
      lowerContent.includes('ich werde jetzt') ||
      lowerContent.includes('ich werde versuchen') ||
      (content.length < 80 &&
        (lowerContent.includes('query') ||
          lowerContent.includes('abfrage') ||
          lowerContent.includes('check') ||
          lowerContent.includes('prüfen') ||
          lowerContent.includes('daten abrufen') ||
          lowerContent.includes('informationen abrufen') ||
          lowerContent.includes('daten aus der datenbank') ||
          lowerContent.includes('informationen aus der datenbank'))))

  openaiMessages.push({
    role: 'assistant',
    content: isAnnouncement ? null : content,
    tool_calls: responseMessage.tool_calls,
  })

  for (const toolCall of responseMessage.tool_calls) {
    const functionName = toolCall.function.name
    const functionArgs = JSON.parse(toolCall.function.arguments || '{}')

    let functionResult: any

    if (functionName === 'queryTable') {
      // Get the last user message for context
      const userMsg = lastUserMessage || openaiMessages
        .filter((m: any) => m.role === 'user')
        .pop()?.content || ''

      let filtersWithRange = applyDateRangeFilters(
        functionArgs.tableName,
        functionArgs.filters || {},
        requestedDateRange,
        userMsg
      )
      filtersWithRange = applyProjectFilters(
        functionArgs.tableName,
        filtersWithRange,
        requestedProjectIdentifiers
      )
      // Apply intelligent employee filters (fuzzy matching)
      filtersWithRange = applyEmployeeFilters(
        functionArgs.tableName,
        filtersWithRange
      )
      // Use smaller default limit for better performance and readability
      const defaultLimit = functionArgs.tableName === 'v_morningplan_full' &&
        (userMsg.toLowerCase().includes('heute') || userMsg.toLowerCase().includes('today'))
        ? 10 : 20
      // For employee searches, use higher limit to ensure we find them
      const employeeLimit = functionArgs.tableName === 't_employees' ? 50 : (functionArgs.limit || defaultLimit)
      const result = await queryTable(
        functionArgs.tableName,
        filtersWithRange,
        employeeLimit,
        functionArgs.joins
      )
      functionResult = result
    } else if (functionName === 'queryTableWithJoin') {
      // Get the last user message for context
      const userMsg = lastUserMessage || openaiMessages
        .filter((m: any) => m.role === 'user')
        .pop()?.content || ''

      let filtersWithRange = applyDateRangeFilters(
        functionArgs.tableName,
        functionArgs.filters || {},
        requestedDateRange,
        userMsg
      )
      filtersWithRange = applyProjectFilters(
        functionArgs.tableName,
        filtersWithRange,
        requestedProjectIdentifiers
      )
      // Apply intelligent employee filters (fuzzy matching)
      filtersWithRange = applyEmployeeFilters(
        functionArgs.tableName,
        filtersWithRange
      )
      // Use smaller default limit for better performance and readability
      const defaultLimit = 20
      // For employee searches, use higher limit
      const employeeLimit = functionArgs.tableName === 't_employees' ? 50 : (functionArgs.limit || defaultLimit)
      const result = await queryTableWithJoin(
        functionArgs.tableName,
        functionArgs.joinTable,
        functionArgs.joinColumn,
        filtersWithRange,
        employeeLimit
      )
      functionResult = result
    } else if (functionName === 'getTableNames') {
      const result = await getTableNames()
      functionResult = result
    } else if (functionName === 'getTableStructure') {
      const result = await getTableStructure(functionArgs.tableName)
      functionResult = result
    } else if (functionName === 'getStatistics') {
      // Get the last user message for context
      const userMsg = lastUserMessage || openaiMessages
        .filter((m: any) => m.role === 'user')
        .pop()?.content || ''

      // Apply date range filters if applicable
      let filtersWithRange = applyDateRangeFilters(
        functionArgs.tableName,
        functionArgs.filters || {},
        requestedDateRange,
        userMsg
      )

      // Apply project filters if applicable
      filtersWithRange = applyProjectFilters(
        functionArgs.tableName,
        filtersWithRange,
        requestedProjectIdentifiers
      )

      // Apply intelligent employee filters (fuzzy matching)
      filtersWithRange = applyEmployeeFilters(
        functionArgs.tableName,
        filtersWithRange
      )

      const result = await getStatistics(functionArgs.tableName, {
        aggregation: functionArgs.aggregation || 'count',
        column: functionArgs.column,
        groupBy: functionArgs.groupBy,
        filters: filtersWithRange,
        limit: functionArgs.limit || 100,
      })
      functionResult = result
    } else if (functionName === 'insertRow') {
      // RBAC: check insert permission
      if (!checkPermission(userRole, 'insert')) {
        functionResult = { error: getPermissionDeniedMessage(userRole, 'insert') }
      } else if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
        functionResult = {
          error: `Insert not allowed for table: ${functionArgs.tableName}`,
        }
      } else if (!functionArgs.values || typeof functionArgs.values !== 'object') {
        // FALLBACK: Try to extract values from conversation if AI didn't include them
        const userMessages = openaiMessages
          .filter((m: any) => m.role === 'user')
          .map((m: any) => m.content)
          .join(' ')

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
            userMessages.match(/Projekt\s+(?!namens)([A-Za-z0-9äöüÄÖÜß_-]+)/i)

          if (nameMatch) {
            functionArgs.values = {
              name: nameMatch[1].trim(),
              status: 'In Planung'
            }
            // Execute the insert directly with extracted values
            const result = await insertRow(functionArgs.tableName, functionArgs.values)
            functionResult = result
          } else {
            functionResult = { error: 'Missing values for insertRow.' }
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
            userMessages.match(/(?:mitarbeiter|arbeiter|worker)\s+(?!namens|neu)([A-Za-z0-9äöüÄÖÜß_-]+)/i)
          if (nameMatch) {
            functionArgs.values = {
              name: nameMatch[1].trim(),
              is_active: true
            }
            // Execute the insert directly with extracted values
            const result = await insertRow(functionArgs.tableName, functionArgs.values)
            functionResult = result
          } else {
            functionResult = { error: 'Missing values for insertRow.' }
          }
        } else if (functionArgs.tableName === 't_materials') {
          // Extract material name
          const nameMatch =
            // Quoted: namens 'X', name "X"
            userMessages.match(/(?:namens?|genannt|name)\s*['"´`]([^'"´`]+)['"´`]/i) ||
            // Unquoted with namens: Material namens X
            userMessages.match(/(?:material)\s+namens\s+([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
            // Direct: neues Material X
            userMessages.match(/(?:neues?)\s+(?:material)\s+(?:namens\s+)?([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
            // Simple: Material X
            userMessages.match(/(?:material)\s+(?!namens|neu)([A-Za-z0-9äöüÄÖÜß_-]+)/i)
          if (nameMatch) {
            // Generate a material_id
            const materialId = `M-${nameMatch[1].trim().toUpperCase().substring(0, 10)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
            functionArgs.values = {
              material_id: materialId,
              name: nameMatch[1].trim(),
              unit: 'Stück',  // Default unit (required field)
              is_active: true,
              vat_rate: 19,
              default_quantity: 1
            }
            // Execute the insert directly with extracted values
            const result = await insertRow(functionArgs.tableName, functionArgs.values)
            functionResult = result
          } else {
            functionResult = { error: 'Missing values for insertRow.' }
          }
        } else if (functionArgs.tableName === 't_vehicles') {
          // Extract vehicle name/nickname
          const nameMatch =
            // Quoted: namens 'X', name "X"
            userMessages.match(/(?:namens?|genannt|name)\s*['"´`]([^'"´`]+)['"´`]/i) ||
            // Unquoted: Fahrzeug namens X
            userMessages.match(/(?:fahrzeug|auto|lkw|transporter)\s+namens\s+([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
            // Direct: neues Fahrzeug X
            userMessages.match(/(?:neues?)\s+(?:fahrzeug|auto|lkw|transporter)\s+(?:namens\s+)?([A-Za-z0-9äöüÄÖÜß_-]+)/i)
          if (nameMatch) {
            // Generate a vehicle_id
            const vehicleId = `V-${nameMatch[1].trim().toUpperCase().substring(0, 10)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
            functionArgs.values = {
              vehicle_id: vehicleId,
              nickname: nameMatch[1].trim(),
              unit: 'Tag',
              status: 'bereit',
              is_deleted: false
            }
            const result = await insertRow(functionArgs.tableName, functionArgs.values)
            functionResult = result
          } else {
            functionResult = { error: 'Missing values for insertRow.' }
          }
        } else if (functionArgs.tableName === 't_services') {
          // Extract service name
          const nameMatch =
            userMessages.match(/(?:namens?|genannt|name)\s*['"´`]([^'"´`]+)['"´`]/i) ||
            userMessages.match(/(?:service|dienstleistung)\s+namens\s+([A-Za-z0-9äöüÄÖÜß_-]+)/i) ||
            userMessages.match(/(?:neues?|neue)\s+(?:service|dienstleistung)\s+(?:namens\s+)?([A-Za-z0-9äöüÄÖÜß_-]+)/i)
          if (nameMatch) {
            const serviceId = `S-${nameMatch[1].trim().toUpperCase().substring(0, 10)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
            functionArgs.values = {
              service_id: serviceId,
              name: nameMatch[1].trim(),
              is_active: true
            }
            const result = await insertRow(functionArgs.tableName, functionArgs.values)
            functionResult = result
          } else {
            functionResult = { error: 'Missing values for insertRow.' }
          }
        } else if (functionArgs.tableName === 't_morningplan_staff') {
          functionResult = {
            error: 'Fehler beim Hinzufügen des Mitarbeiters: Es fehlen erforderliche Angaben (plan_id oder employee_id). Bitte stelle sicher, dass sowohl der Mitarbeiter als auch das Projekt existieren.'
          }
        } else {
          functionResult = { error: 'Missing values for insertRow.' }
        }
      } else if (functionArgs.tableName === 't_morningplan_staff') {
        // Validate required fields for employee assignment
        let planId = functionArgs.values.plan_id
        let employeeId = functionArgs.values.employee_id

        // If IDs are missing, try to extract them from previous query results
        if (!planId || !employeeId) {
          const userMsg = lastUserMessage || openaiMessages
            .filter((m: any) => m.role === 'user')
            .pop()?.content || ''

          // Try to infer project name and employee name from user message
          const projectName = requestedProjectIdentifiers?.projectName ||
            userMsg.match(/projekt\s+(\w+)/i)?.[1] ||
            userMsg.match(/zu\s+(?:dem\s+)?projekt\s+(\w+)/i)?.[1]

          const employeeName = userMsg.match(/füge\s+(\w+)/i)?.[1] ||
            userMsg.match(/(\w+)\s+zu/i)?.[1]

          // Extract date from user message if mentioned
          const dateMatch = userMsg.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/)
          const planDate = dateMatch
            ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
            : undefined

          // Try to extract IDs from previous queries
          const extractedIds = extractIdsFromPreviousQueries(
            openaiMessages,
            projectName,
            employeeName,
            planDate
          )

          // Use extracted IDs if available
          if (!planId && extractedIds.plan_id) {
            planId = extractedIds.plan_id
            functionArgs.values.plan_id = planId
          }
          if (!employeeId && extractedIds.employee_id) {
            employeeId = extractedIds.employee_id
            functionArgs.values.employee_id = employeeId
          }
        }

        // Final validation
        if (!planId || !employeeId) {
          functionResult = {
            error: 'Fehler beim Hinzufügen des Mitarbeiters: Es fehlen erforderliche Angaben (plan_id oder employee_id). Bitte stelle sicher, dass sowohl der Mitarbeiter als auch das Projekt existieren und die IDs korrekt extrahiert wurden. Tipp: Führe zuerst eine Query für das Projekt und den Mitarbeiter durch, um die IDs zu erhalten.'
          }
        } else {
          // Continue with normal processing
          const valuesWithDefaults = { ...functionArgs.values }
          if (valuesWithDefaults.sort_order === undefined) {
            valuesWithDefaults.sort_order = 0
          }

          if (!functionArgs.confirm) {
            functionResult = {
              preview: true,
              tableName: functionArgs.tableName,
              values: valuesWithDefaults,
              message: 'Bitte bestätige, dass dieser Eintrag erstellt werden soll.',
            }
          } else {
            const result = await insertRow(functionArgs.tableName, valuesWithDefaults)

            // Improve error messages for employee assignment
            if (result.error) {
              const errorLower = result.error.toLowerCase()
              if (errorLower.includes('foreign key') || errorLower.includes('violates foreign key')) {
                result.error = 'Der Mitarbeiter oder das Projekt konnte nicht gefunden werden. Bitte überprüfe die Namen auf Tippfehler.'
              } else if (errorLower.includes('duplicate') || errorLower.includes('unique constraint') || errorLower.includes('already exists')) {
                result.error = 'Der Mitarbeiter ist bereits diesem Projekt zugeordnet.'
              } else if (errorLower.includes('missing') || errorLower.includes('required')) {
                result.error = 'Fehler beim Hinzufügen des Mitarbeiters: Es fehlen erforderliche Angaben (plan_id oder employee_id). Bitte stelle sicher, dass sowohl der Mitarbeiter als auch das Projekt existieren.'
              }
            }

            functionResult = result
          }
        }
      } else {
        // Apply sensible defaults for missing optional fields
        const valuesWithDefaults = { ...functionArgs.values }

        if (functionArgs.tableName === 't_employees') {
          // Defaults for employees
          if (valuesWithDefaults.is_active === undefined) {
            valuesWithDefaults.is_active = true
          }
          if (valuesWithDefaults.role === undefined && !valuesWithDefaults.role) {
            valuesWithDefaults.role = null
          }
          if (valuesWithDefaults.hourly_rate === undefined) {
            valuesWithDefaults.hourly_rate = 0
          }
          // Normalize contract_type: handle any variation (intern, int, extern, etc.)
          if (valuesWithDefaults.contract_type !== null && valuesWithDefaults.contract_type !== undefined) {
            const contractTypeLower = String(valuesWithDefaults.contract_type).toLowerCase().trim()
            if (contractTypeLower.includes('intern') || contractTypeLower === 'int') {
              valuesWithDefaults.contract_type = 'Intern'
            } else if (contractTypeLower.includes('extern')) {
              valuesWithDefaults.contract_type = 'Extern'
            }
          } else {
            // If contract_type is undefined or null, leave it as null (don't set a default)
            valuesWithDefaults.contract_type = null
          }
        } else if (functionArgs.tableName === 't_projects') {
          // Defaults for projects
          if (valuesWithDefaults.status === undefined) {
            valuesWithDefaults.status = 'geplant'
          }
          // Auto-generate project_code if missing
          if (!valuesWithDefaults.project_code) {
            const now = new Date()
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
            const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase()
            valuesWithDefaults.project_code = `PRJ-${dateStr}-${randomStr}`
          }
        } else if (functionArgs.tableName === 't_materials') {
          // Defaults for materials
          if (valuesWithDefaults.is_active === undefined) {
            valuesWithDefaults.is_active = true
          }
          if (valuesWithDefaults.vat_rate === undefined) {
            valuesWithDefaults.vat_rate = 19
          }
          if (valuesWithDefaults.default_quantity === undefined) {
            valuesWithDefaults.default_quantity = 1
          }
          // Auto-generate material_id if missing (format: M-[UPPERCASE_NAME])
          if (!valuesWithDefaults.material_id && valuesWithDefaults.name) {
            const nameUpper = String(valuesWithDefaults.name).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10)
            const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase()
            valuesWithDefaults.material_id = `M-${nameUpper}-${randomStr}`
          }
        }

        if (!functionArgs.confirm) {
          // Preview mode - return the data that would be inserted without actually inserting
          functionResult = {
            preview: true,
            tableName: functionArgs.tableName,
            values: valuesWithDefaults,
            message: 'Bitte bestätige, dass dieser Eintrag erstellt werden soll.',
          }
        } else {
          // Note: We don't have access to req here, so we'll pass undefined for ipAddress
          // In production, you might want to pass this through the function chain
          const result = await insertRow(functionArgs.tableName, valuesWithDefaults)

          // Improve error messages for employee assignment
          if (result.error && functionArgs.tableName === 't_morningplan_staff') {
            const errorLower = result.error.toLowerCase()
            if (errorLower.includes('foreign key') || errorLower.includes('violates foreign key')) {
              result.error = 'Der Mitarbeiter oder das Projekt konnte nicht gefunden werden. Bitte überprüfe die Namen auf Tippfehler.'
            } else if (errorLower.includes('duplicate') || errorLower.includes('unique constraint') || errorLower.includes('already exists')) {
              result.error = 'Der Mitarbeiter ist bereits diesem Projekt zugeordnet.'
            } else if (errorLower.includes('missing') || errorLower.includes('required')) {
              result.error = 'Fehler beim Hinzufügen des Mitarbeiters: Es fehlen erforderliche Angaben (plan_id oder employee_id). Bitte stelle sicher, dass sowohl der Mitarbeiter als auch das Projekt existieren.'
            }
          }

          functionResult = result
        }
      }
    } else if (functionName === 'updateRow') {
      // RBAC: check update permission
      if (!checkPermission(userRole, 'update')) {
        functionResult = { error: getPermissionDeniedMessage(userRole, 'update') }
      } else if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
        functionResult = {
          error: `Update not allowed for table: ${functionArgs.tableName}`,
        }
      } else if (!functionArgs.filters || typeof functionArgs.filters !== 'object') {
        functionResult = { error: 'Missing filters for updateRow. Filters are required to identify which row(s) to update.' }
      } else if (!functionArgs.values || typeof functionArgs.values !== 'object') {
        functionResult = { error: 'Missing values for updateRow.' }
      } else {
        // Note: We don't have access to req here, so we'll pass undefined for ipAddress
        // In production, you might want to pass this through the function chain
        const result = await updateRow(functionArgs.tableName, functionArgs.filters, functionArgs.values, {
          requireSingleRow: true, // Require single row for safety
        })
        functionResult = result
      }
    } else if (functionName === 'deleteRow') {
      // RBAC: check delete permission
      if (!checkPermission(userRole, 'delete')) {
        functionResult = { error: getPermissionDeniedMessage(userRole, 'delete') }
      } else if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
        functionResult = {
          error: `Delete not allowed for table: ${functionArgs.tableName}`,
        }
      } else if (!functionArgs.filters || typeof functionArgs.filters !== 'object') {
        // Try to extract ID from previous queries
        const extractedIds = extractIdsFromPreviousQueries(openaiMessages)

        // Determine which ID to use based on table
        let filtersToUse = functionArgs.filters || {}

        if (functionArgs.tableName === 't_employees' && extractedIds.employee_id) {
          filtersToUse = { employee_id: extractedIds.employee_id }
        } else if (functionArgs.tableName === 't_projects' && extractedIds.project_id) {
          filtersToUse = { project_id: extractedIds.project_id }
        } else if (functionArgs.tableName === 't_morningplan' && extractedIds.plan_id) {
          filtersToUse = { plan_id: extractedIds.plan_id }
        }

        if (!filtersToUse || Object.keys(filtersToUse).length === 0) {
          functionResult = { error: 'Missing filters for deleteRow. Filters are required to identify which row(s) to delete. Please query the table first to get the unique ID (e.g., employee_id, project_id).' }
        } else {
          const result = await deleteRow(functionArgs.tableName, filtersToUse, {
            requireSingleRow: true, // Require single row for safety
          })
          functionResult = result
        }
      } else {
        // Note: We don't have access to req here, so we'll pass undefined for ipAddress
        // In production, you might want to pass this through the function chain
        const result = await deleteRow(functionArgs.tableName, functionArgs.filters, {
          requireSingleRow: true, // Require single row for safety
        })
        functionResult = result
      }
    } else {
      functionResult = { error: `Unknown function: ${functionName}` }
    }

    // Format tool result - add instruction to interpret, not repeat
    let toolContent = formatJsonOutput(functionResult)

    // Add instruction for the AI to interpret the result, not show it
    if (!functionResult.error) {
      toolContent = `[INTERNAL TOOL RESULT - INTERPRET THIS DATA AND PRESENT IT IN NATURAL GERMAN. DO NOT SHOW THIS JSON TO THE USER!]\n\n${toolContent}`
    }

    openaiMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolContent,
    })
  }
}

export const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
}
