import { supabaseAdmin } from './supabase'
import { sanitizeFilters, sanitizeValues, validateTableName, validateSingleRowFilters } from './validation'
import { createAuditLog } from './audit-log'
import { INSERT_ALLOWED_TABLES } from './constants'
import { retrySupabaseOperation } from './retry'
import { getUserFriendlyErrorMessage } from './error-messages'

/**
 * Get statistics/aggregations from a table
 * Supports COUNT, SUM, AVG, MIN, MAX, GROUP BY
 */
export async function getStatistics(
  tableName: string,
  options: {
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
    column?: string
    groupBy?: string
    filters?: Record<string, any>
    limit?: number
  } = {}
) {
  try {
    if (!supabaseAdmin) {
      return {
        data: null,
        error: 'Service role key not configured'
      }
    }

    const { aggregation = 'count', column, groupBy, filters = {}, limit = 1000 } = options

    // Use queryTable to get data, then calculate statistics in-memory
    // This approach works with existing infrastructure and doesn't require SQL injection
    const result = await queryTable(tableName, filters, limit)
    
    if (result.error) {
      return result
    }

    // Process results to calculate statistics
    if (!result.data || !Array.isArray(result.data)) {
      return {
        data: null,
        error: 'Invalid data format'
      }
    }

    const data = result.data
    let statistics: any = {}

    if (aggregation === 'count') {
      if (groupBy) {
        // Group by and count
        const grouped: Record<string, number> = {}
        for (const row of data) {
          const groupValue = (row as any)[groupBy] || 'Unbekannt'
          grouped[groupValue] = (grouped[groupValue] || 0) + 1
        }
        statistics = Object.entries(grouped).map(([key, value]) => ({
          [groupBy]: key,
          count: value
        }))
      } else {
        statistics = { count: data.length }
      }
    } else if (column) {
      const values = data.map((row: any) => parseFloat((row as any)[column])).filter((v: number) => !isNaN(v))
      
      if (values.length === 0) {
        return {
          data: null,
          error: `No valid numeric values found in column ${column}`
        }
      }

      if (groupBy) {
        // Group by and aggregate
        const grouped: Record<string, number[]> = {}
        for (const row of data) {
          const groupValue = (row as any)[groupBy] || 'Unbekannt'
          const numValue = parseFloat((row as any)[column])
          if (!isNaN(numValue)) {
            if (!grouped[groupValue]) {
              grouped[groupValue] = []
            }
            grouped[groupValue].push(numValue)
          }
        }

        statistics = Object.entries(grouped).map(([key, values]) => {
          const result: Record<string, any> = { [groupBy]: key }
          switch (aggregation) {
            case 'sum':
              result.total = values.reduce((a, b) => a + b, 0)
              break
            case 'avg':
              result.average = values.reduce((a, b) => a + b, 0) / values.length
              break
            case 'min':
              result.minimum = Math.min(...values)
              break
            case 'max':
              result.maximum = Math.max(...values)
              break
          }
          return result
        })
      } else {
        // Single aggregation
        switch (aggregation) {
          case 'sum':
            statistics = { total: values.reduce((a, b) => a + b, 0) }
            break
          case 'avg':
            statistics = { average: values.reduce((a, b) => a + b, 0) / values.length }
            break
          case 'min':
            statistics = { minimum: Math.min(...values) }
            break
          case 'max':
            statistics = { maximum: Math.max(...values) }
            break
        }
      }
    }

    return {
      data: statistics,
      error: null
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Statistics calculation failed'
    }
  }
}

/**
 * Execute a read-only SQL query via Supabase REST API
 * Note: This requires the service role key and uses the REST API directly
 */
export async function executeReadOnlyQuery(sql: string) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use Supabase REST API for raw SQL queries
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (!response.ok) {
      // Fallback: try to query tables directly using Supabase client methods
      // This is a safer approach that works with the standard client
      throw new Error('Direct SQL execution requires custom RPC function')
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    // Return error for OpenAI to handle
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Query execution failed'
    }
  }
}

/**
 * Get table names from Supabase
 * Uses PostgREST introspection to discover available tables
 */
export async function getTableNames() {
  try {
    if (!supabaseAdmin) {
      return { 
        tables: [], 
        error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.' 
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Try to get schema information using PostgREST's OpenAPI endpoint
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      })

      if (response.ok) {
        // The root endpoint returns OpenAPI schema
        const schema = await response.json()
        
        // Extract table names from the OpenAPI paths
        if (schema.paths) {
          const tables = Object.keys(schema.paths)
            .filter(path => path.startsWith('/') && !path.includes('rpc'))
            .map(path => path.replace(/^\//, ''))
            .filter(table => table && !table.includes('{'))
          
          if (tables.length > 0) {
            return { tables, error: null }
          }
        }
      }
    } catch (fetchError) {
      // Fall through to alternative method
      console.log('OpenAPI introspection failed, trying alternative method')
    }

    // Alternative: Try to query information_schema via RPC
    // This requires a custom RPC function in Supabase
    try {
      const { data, error } = await supabaseAdmin.rpc('get_table_names')
      
      if (!error && data) {
        return { tables: data, error: null }
      }
    } catch (rpcError) {
      // RPC function doesn't exist, continue to next method
    }

    // Last resort: Try querying information_schema directly via REST
    // Note: This may not work due to RLS, but worth trying
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name`,
        {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=representation',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const tables = data.map((row: any) => row.table_name).filter(Boolean)
          if (tables.length > 0) {
            return { tables, error: null }
          }
        }
      }
    } catch (infoSchemaError) {
      // information_schema query failed
    }

    // If all methods fail, return empty with helpful message
    return { 
      tables: [], 
      error: 'Could not automatically discover tables. You can still query tables by name using the queryTable function. Common table names might include: users, products, orders, etc. Try asking about specific data and I will attempt to query the relevant tables.' 
    }
  } catch (err) {
    return {
      tables: [],
      error: err instanceof Error ? err.message : 'Unknown error while fetching table names'
    }
  }
}

/**
 * Get table structure (columns) for a specific table
 * This helps understand what fields are available
 */
export async function getTableStructure(tableName: string) {
  try {
    if (!supabaseAdmin) {
      return {
        columns: [],
        error: 'Service role key not configured'
      }
    }

    // Try to get one row to see the structure
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      return {
        columns: [],
        error: error.message
      }
    }

    // Extract column names from the first row
    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      return {
        columns,
        error: null,
        sampleRow: data[0] // Include a sample row to help understand data types
      }
    }

    // If no data but table exists, try to infer from error or return empty
    return {
      columns: [],
      error: null,
      message: 'Table exists but contains no data'
    }
  } catch (err) {
    return {
      columns: [],
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Query a specific table with filters and optional joins
 * Supports various filter types: eq, neq, gt, gte, lt, lte, like, ilike, in
 * Supports joins using Supabase's relationship syntax: 'related_table(*)'
 */
export async function queryTable(
  tableName: string,
  filters: Record<string, any> = {},
  limit: number = 100,
  joins?: string[]
) {
  try {
    if (!supabaseAdmin) {
      return {
        data: null,
        error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
      }
    }

    // Validate and sanitize filters
    const filtersValidation = sanitizeFilters(filters)
    if (!filtersValidation.valid) {
      return {
        data: null,
        error: filtersValidation.error || 'Invalid filters'
      }
    }

    const sanitizedFilters = filtersValidation.sanitized!

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return {
        data: null,
        error: 'Limit must be between 1 and 1000'
      }
    }

    // Build select statement with joins if provided
    let selectStatement = '*'
    if (joins && joins.length > 0) {
      // Validate join syntax
      const validJoins = joins.filter(join => /^[a-zA-Z_][a-zA-Z0-9_]*(\!?[a-zA-Z0-9_]*)?\([^)]*\)$/.test(join))
      if (validJoins.length > 0) {
        selectStatement = `*, ${validJoins.join(', ')}`
      }
    }

    let query = supabaseAdmin.from(tableName).select(selectStatement).limit(limit)

    // Apply sanitized filters
    // Support both simple key-value (defaults to eq) and advanced filter objects
    for (const [key, value] of Object.entries(sanitizedFilters)) {
      if (value === undefined || value === null) {
        continue
      }

      // If value is an object with filter type, use it
      if (typeof value === 'object' && !Array.isArray(value) && value.type) {
        const filterType = value.type
        const filterValue = value.value

        switch (filterType) {
          case 'eq':
            query = query.eq(key, filterValue)
            break
          case 'neq':
            query = query.neq(key, filterValue)
            break
          case 'gt':
            query = query.gt(key, filterValue)
            break
          case 'gte':
            query = query.gte(key, filterValue)
            break
          case 'lt':
            query = query.lt(key, filterValue)
            break
          case 'lte':
            query = query.lte(key, filterValue)
            break
          case 'between':
            if (Array.isArray(filterValue) && filterValue.length === 2) {
              query = query.gte(key, filterValue[0]).lte(key, filterValue[1])
            }
            break
          case 'like':
            query = query.like(key, `%${filterValue}%`)
            break
          case 'ilike':
            query = query.ilike(key, `%${filterValue}%`)
            break
          case 'in':
            if (Array.isArray(filterValue)) {
              query = query.in(key, filterValue)
            }
            break
          default:
            query = query.eq(key, filterValue)
        }
      } else {
        // Simple equality filter
        query = query.eq(key, value)
      }
    }

    // Retry query with exponential backoff for transient failures
    const result = await retrySupabaseOperation(async () => {
    const { data, error } = await query
    if (error) {
        throw error
      }
      return { data: data || [], error: null }
    })

    if (result.error) {
      const errorMessage = getUserFriendlyErrorMessage(result.error, 'QUERY', tableName)
      return {
        data: null,
        error: errorMessage
      }
    }

    return result
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Query failed'
    }
  }
}

export async function insertRow(
  tableName: string,
  values: Record<string, any>,
  options?: {
    userId?: string
    ipAddress?: string
  }
) {
  try {
    if (!supabaseAdmin) {
      return {
        data: null,
        error: 'Service role key not configured'
      }
    }

    // Validate table name
    const tableValidation = validateTableName(tableName, INSERT_ALLOWED_TABLES)
    if (!tableValidation.valid) {
      createAuditLog('INSERT', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        values,
        error: tableValidation.error,
      })
      return {
        data: null,
        error: tableValidation.error || 'Invalid table name'
      }
    }

    // Sanitize values
    const valuesValidation = sanitizeValues(values)
    if (!valuesValidation.valid) {
      createAuditLog('INSERT', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        values,
        error: valuesValidation.error,
      })
      return {
        data: null,
        error: valuesValidation.error || 'Invalid values'
      }
    }

    const sanitizedValues = valuesValidation.sanitized!

    if (!supabaseAdmin) {
      createAuditLog('INSERT', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        values: sanitizedValues,
        error: 'Service role key not configured',
      })
      return {
        data: null,
        error: 'Service role key not configured'
      }
    }

    // Perform insert with retry logic
    const insertResult = await retrySupabaseOperation(async () => {
      const { data, error } = await supabaseAdmin!
        .from(tableName)
        .insert(sanitizedValues)
        .select()
        .single()

      if (error) {
        // Throw the full error object, not just the message
        throw error
      }
      return { data, error: null }
    })

    if (insertResult.error) {
      // Log the raw error for debugging
      const rawError = insertResult.error as any
      console.error(`[SUPABASE INSERT ERROR] Table: ${tableName}`, {
        rawError: rawError,
        errorCode: rawError?.code,
        errorMessage: rawError?.message,
        errorDetails: rawError?.details,
        errorHint: rawError?.hint,
        values: JSON.stringify(sanitizedValues, null, 2)
      })
      
      // For t_projects, return raw error for debugging
      let detailedError: string
      if (tableName === 't_projects' && rawError?.message) {
        // Return raw error for t_projects to help debug
        detailedError = `Fehler beim Erstellen: ${rawError.message}${rawError.hint ? ` (Hinweis: ${rawError.hint})` : ''}${rawError.code ? ` [Code: ${rawError.code}]` : ''}`
      } else {
        detailedError = getUserFriendlyErrorMessage(insertResult.error, 'INSERT', tableName)
        // Still include raw error details if available
        if (rawError?.message) {
          detailedError = `${detailedError}\n\nTechnische Details: ${rawError.message}${rawError.hint ? `\nHinweis: ${rawError.hint}` : ''}${rawError.code ? `\nFehlercode: ${rawError.code}` : ''}`
        }
      }
      
      createAuditLog('INSERT', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        values: sanitizedValues,
        error: detailedError,
        rawError: insertResult.error,
      })
      return { data: null, error: detailedError }
    }

    // Log successful insert
    createAuditLog('INSERT', tableName, 'SUCCESS', {
      userId: options?.userId,
      ipAddress: options?.ipAddress,
      values: sanitizedValues,
    })

    return { data: insertResult.data, error: null }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    createAuditLog('INSERT', tableName, 'FAILURE', {
      userId: options?.userId,
      ipAddress: options?.ipAddress,
      values,
      error: errorMessage,
    })
    return {
      data: null,
      error: errorMessage
    }
  }
}

export async function updateRow(
  tableName: string,
  filters: Record<string, any>,
  values: Record<string, any>,
  options?: {
    userId?: string
    ipAddress?: string
    requireSingleRow?: boolean
  }
) {
  try {
    if (!supabaseAdmin) {
      return {
        data: null,
        error: 'Service role key not configured'
      }
    }

    // Validate table name
    const tableValidation = validateTableName(tableName, INSERT_ALLOWED_TABLES)
    if (!tableValidation.valid) {
      createAuditLog('UPDATE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters,
        values,
        error: tableValidation.error,
      })
      return {
        data: null,
        error: tableValidation.error || 'Invalid table name'
      }
    }

    // Sanitize filters
    const filtersValidation = sanitizeFilters(filters)
    if (!filtersValidation.valid) {
      createAuditLog('UPDATE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters,
        values,
        error: filtersValidation.error,
      })
      return {
        data: null,
        error: filtersValidation.error || 'Invalid filters'
      }
    }

    // Validate single row requirement if specified
    if (options?.requireSingleRow !== false) {
      const singleRowValidation = validateSingleRowFilters(filtersValidation.sanitized!)
      if (!singleRowValidation.valid) {
        createAuditLog('UPDATE', tableName, 'FAILURE', {
          userId: options?.userId,
          ipAddress: options?.ipAddress,
          filters: filtersValidation.sanitized,
          values,
          error: singleRowValidation.error,
        })
        return {
          data: null,
          error: singleRowValidation.error || 'Filters must identify exactly one row'
        }
      }
    }

    // Sanitize values
    const valuesValidation = sanitizeValues(values)
    if (!valuesValidation.valid) {
      createAuditLog('UPDATE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: filtersValidation.sanitized,
        values,
        error: valuesValidation.error,
      })
      return {
        data: null,
        error: valuesValidation.error || 'Invalid values'
      }
    }

    const sanitizedFilters = filtersValidation.sanitized!
    const sanitizedValues = valuesValidation.sanitized!

    if (!supabaseAdmin) {
      return {
        data: null,
        error: 'Service role key not configured'
      }
    }

    // First, check how many rows would be affected
    let countQuery = supabaseAdmin.from(tableName).select('*', { count: 'exact', head: true })
    
    // Apply filters to count query
    for (const [key, value] of Object.entries(sanitizedFilters)) {
      if (value === undefined || value === null) {
        continue
      }
      if (typeof value === 'object' && !Array.isArray(value) && value.type) {
        const filterType = value.type
        const filterValue = value.value
        switch (filterType) {
          case 'eq':
            countQuery = countQuery.eq(key, filterValue)
            break
          case 'neq':
            countQuery = countQuery.neq(key, filterValue)
            break
          case 'in':
            if (Array.isArray(filterValue)) {
              countQuery = countQuery.in(key, filterValue)
            }
            break
          default:
            countQuery = countQuery.eq(key, filterValue)
        }
      } else {
        countQuery = countQuery.eq(key, value)
      }
    }
    
    const { count } = await countQuery

    if (count === 0) {
      createAuditLog('UPDATE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: sanitizedFilters,
        values: sanitizedValues,
        error: 'No rows found matching filters',
      })
      return {
        data: null,
        error: 'Keine Zeilen gefunden, die den Filtern entsprechen'
      }
    }

    if (options?.requireSingleRow !== false && count !== 1) {
      createAuditLog('UPDATE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: sanitizedFilters,
        values: sanitizedValues,
        error: `Expected 1 row, found ${count}`,
      })
      return {
        data: null,
        error: `Mehrere Zeilen gefunden (${count}). Bitte verwende spezifischere Filter, um genau eine Zeile zu identifizieren.`
      }
    }

    // Build update query
    let query = supabaseAdmin.from(tableName).update(sanitizedValues)

    // Apply filters
    for (const [key, value] of Object.entries(sanitizedFilters)) {
      if (value === undefined || value === null) {
        continue
      }

      // Support filter objects with type
      if (typeof value === 'object' && !Array.isArray(value) && value.type) {
        const filterType = value.type
        const filterValue = value.value

        switch (filterType) {
          case 'eq':
            query = query.eq(key, filterValue)
            break
          case 'neq':
            query = query.neq(key, filterValue)
            break
          case 'in':
            if (Array.isArray(filterValue)) {
              query = query.in(key, filterValue)
            }
            break
          default:
            query = query.eq(key, filterValue)
        }
      } else {
        // Simple equality filter
        // Use case-insensitive search for 'name' fields
        if (key === 'name' && typeof value === 'string') {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    }

    // Perform update with retry logic
    const updateResult = await retrySupabaseOperation(async () => {
      const { data, error } = await query.select().single()
      if (error) {
        throw error
      }
      return { data, error: null }
    })

    if (updateResult.error) {
      const errorMessage = getUserFriendlyErrorMessage(updateResult.error, 'UPDATE', tableName)
      createAuditLog('UPDATE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: sanitizedFilters,
        values: sanitizedValues,
        error: errorMessage,
      })
      return { data: null, error: errorMessage }
    }

    // Log successful update
    createAuditLog('UPDATE', tableName, 'SUCCESS', {
      userId: options?.userId,
      ipAddress: options?.ipAddress,
      filters: sanitizedFilters,
      values: sanitizedValues,
    })

    return { data: updateResult.data, error: null }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    createAuditLog('UPDATE', tableName, 'FAILURE', {
      userId: options?.userId,
      ipAddress: options?.ipAddress,
      filters,
      values,
      error: errorMessage,
    })
    return {
      data: null,
      error: errorMessage
    }
  }
}

export async function deleteRow(
  tableName: string,
  filters: Record<string, any>,
  options?: {
    userId?: string
    ipAddress?: string
    requireSingleRow?: boolean
  }
) {
  try {
    if (!supabaseAdmin) {
      return {
        data: null,
        error: 'Service role key not configured'
      }
    }

    // Validate table name
    const tableValidation = validateTableName(tableName, INSERT_ALLOWED_TABLES)
    if (!tableValidation.valid) {
      createAuditLog('DELETE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters,
        error: tableValidation.error,
      })
      return {
        data: null,
        error: tableValidation.error || 'Invalid table name'
      }
    }

    // Sanitize filters
    const filtersValidation = sanitizeFilters(filters)
    if (!filtersValidation.valid) {
      createAuditLog('DELETE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters,
        error: filtersValidation.error,
      })
      return {
        data: null,
        error: filtersValidation.error || 'Invalid filters'
      }
    }

    // Validate single row requirement if specified
    if (options?.requireSingleRow !== false) {
      const singleRowValidation = validateSingleRowFilters(filtersValidation.sanitized!)
      if (!singleRowValidation.valid) {
        createAuditLog('DELETE', tableName, 'FAILURE', {
          userId: options?.userId,
          ipAddress: options?.ipAddress,
          filters: filtersValidation.sanitized,
          error: singleRowValidation.error,
        })
        return {
          data: null,
          error: singleRowValidation.error || 'Filters must identify exactly one row'
        }
      }
    }

    const sanitizedFilters = filtersValidation.sanitized!

    // First, check how many rows would be affected
    let countQuery = supabaseAdmin.from(tableName).select('*', { count: 'exact', head: true })
    
    // Apply filters to count query
    for (const [key, value] of Object.entries(sanitizedFilters)) {
      if (value === undefined || value === null) {
        continue
      }
      if (typeof value === 'object' && !Array.isArray(value) && value.type) {
        const filterType = value.type
        const filterValue = value.value
        switch (filterType) {
          case 'eq':
            countQuery = countQuery.eq(key, filterValue)
            break
          case 'neq':
            countQuery = countQuery.neq(key, filterValue)
            break
          case 'in':
            if (Array.isArray(filterValue)) {
              countQuery = countQuery.in(key, filterValue)
            }
            break
          default:
            countQuery = countQuery.eq(key, filterValue)
        }
      } else {
        countQuery = countQuery.eq(key, value)
      }
    }
    
    const { count } = await countQuery

    if (count === 0) {
      createAuditLog('DELETE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: sanitizedFilters,
        error: 'No rows found matching filters',
      })
      return {
        data: null,
        error: 'Keine Zeilen gefunden, die den Filtern entsprechen'
      }
    }

    if (options?.requireSingleRow !== false && count !== 1) {
      createAuditLog('DELETE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: sanitizedFilters,
        error: `Expected 1 row, found ${count}`,
      })
      return {
        data: null,
        error: `Mehrere Zeilen gefunden (${count}). Bitte verwende spezifischere Filter, um genau eine Zeile zu identifizieren.`
      }
    }

    // Build delete query
    let query = supabaseAdmin.from(tableName).delete()

    // Apply filters
    for (const [key, value] of Object.entries(sanitizedFilters)) {
      if (value === undefined || value === null) {
        continue
      }

      // Support filter objects with type
      if (typeof value === 'object' && !Array.isArray(value) && value.type) {
        const filterType = value.type
        const filterValue = value.value

        switch (filterType) {
          case 'eq':
            query = query.eq(key, filterValue)
            break
          case 'neq':
            query = query.neq(key, filterValue)
            break
          case 'in':
            if (Array.isArray(filterValue)) {
              query = query.in(key, filterValue)
            }
            break
          default:
            query = query.eq(key, filterValue)
        }
      } else {
        // Simple equality filter
        // Use case-insensitive search for 'name' fields
        if (key === 'name' && typeof value === 'string') {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    }

    // Perform delete with retry logic
    const deleteResult = await retrySupabaseOperation(async () => {
      const { data, error } = await query.select()
      if (error) {
        throw error
      }
    return { data, error: null }
    })

    if (deleteResult.error) {
      const errorMessage = getUserFriendlyErrorMessage(deleteResult.error, 'DELETE', tableName)
      createAuditLog('DELETE', tableName, 'FAILURE', {
        userId: options?.userId,
        ipAddress: options?.ipAddress,
        filters: sanitizedFilters,
        error: errorMessage,
      })
      return { data: null, error: errorMessage }
    }

    const deletedCount = deleteResult.data?.length || 0

    // Log successful delete
    createAuditLog('DELETE', tableName, 'SUCCESS', {
      userId: options?.userId,
      ipAddress: options?.ipAddress,
      filters: sanitizedFilters,
      metadata: { deleted_count: deletedCount },
    })

    return { 
      data: { deleted_count: deletedCount, deleted_rows: deleteResult.data || [] }, 
      error: null 
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    createAuditLog('DELETE', tableName, 'FAILURE', {
      userId: options?.userId,
      ipAddress: options?.ipAddress,
      filters,
      error: errorMessage,
    })
    return {
      data: null,
      error: errorMessage
    }
  }
}

/**
 * Query a table with a join to a related table
 * This is useful when data is spread across multiple related tables
 * Example: queryTableWithJoin('t_materials', 't_material_prices', 'material_id') to get materials with their prices
 * 
 * Note: In Supabase PostgREST, joins work when:
 * - joinTable has a foreign key column pointing to tableName
 * - Syntax: joinTable!foreign_key_column(*) or joinTable(*) for auto-detection
 */
export async function queryTableWithJoin(
  tableName: string,
  joinTable: string,
  joinColumn?: string,
  filters: Record<string, any> = {},
  limit: number = 100
) {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: 'Service role key not configured'
    }
  }

  // Try multiple join patterns
  const joinPatterns: string[] = []
  
  if (joinColumn) {
    // Pattern 1: Explicit foreign key: joinTable!joinColumn(*)
    joinPatterns.push(`${joinTable}!${joinColumn}(*)`)
    // Pattern 2: Try with table prefix removed from column name
    const columnWithoutPrefix = joinColumn.replace(/^.*_/, '')
    if (columnWithoutPrefix !== joinColumn) {
      joinPatterns.push(`${joinTable}!${columnWithoutPrefix}(*)`)
    }
  }
  
  // Pattern 3: Auto-detect (Supabase will try to find the relationship)
  joinPatterns.push(`${joinTable}(*)`)
  
  // Pattern 4: Try common foreign key naming patterns
  const commonFkNames = [
    `${tableName.replace('t_', '')}_id`,
    `id_${tableName.replace('t_', '')}`,
    `${tableName}_id`,
    'material_id',
    'product_id',
    'item_id'
  ]
  
  for (const fkName of commonFkNames) {
    if (fkName !== joinColumn) {
      joinPatterns.push(`${joinTable}!${fkName}(*)`)
    }
  }

  // Try each pattern until one works
  for (const joinSyntax of joinPatterns) {
    try {
      let query = supabaseAdmin
        .from(tableName)
        .select(`*, ${joinSyntax}`)
        .limit(limit)

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null) {
          continue
        }

        if (typeof value === 'object' && !Array.isArray(value) && value.type) {
          const filterType = value.type
          const filterValue = value.value

          switch (filterType) {
            case 'eq':
              query = query.eq(key, filterValue)
              break
            case 'neq':
              query = query.neq(key, filterValue)
              break
            case 'gt':
              query = query.gt(key, filterValue)
              break
            case 'gte':
              query = query.gte(key, filterValue)
              break
            case 'lt':
              query = query.lt(key, filterValue)
              break
            case 'lte':
              query = query.lte(key, filterValue)
              break
            case 'between':
              if (Array.isArray(filterValue) && filterValue.length === 2) {
                query = query.gte(key, filterValue[0]).lte(key, filterValue[1])
              }
              break
            case 'like':
              query = query.like(key, `%${filterValue}%`)
              break
            case 'ilike':
              query = query.ilike(key, `%${filterValue}%`)
              break
            case 'in':
              if (Array.isArray(filterValue)) {
                query = query.in(key, filterValue)
              }
              break
            default:
              query = query.eq(key, filterValue)
          }
        } else {
          query = query.eq(key, value)
        }
      }

      const { data, error } = await query

      if (!error && data) {
        return { data, error: null }
      }

      // If error, continue to next pattern unless it's a clear table-not-found error
      if (error && error.code === 'PGRST116') {
        // Table doesn't exist, no point trying other patterns
        return {
          data: null,
          error: `Table "${tableName}" or "${joinTable}" does not exist. Error: ${error.message}`
        }
      }
    } catch (err) {
      // Continue to next pattern
      continue
    }
  }

  // If all patterns failed, try querying from the other direction
  // Maybe we need to query from joinTable and join to tableName
  try {
    // Try reverse join: query from joinTable and join to tableName
    const reverseJoinPatterns = [
      `${tableName}(*)`,
      `${tableName}!${joinColumn || 'id'}(*)`
    ]

    for (const reverseJoin of reverseJoinPatterns) {
      try {
        let query = supabaseAdmin
          .from(joinTable)
          .select(`*, ${reverseJoin}`)
          .limit(limit)

        const { data, error } = await query
        if (!error && data) {
          return { data, error: null, note: 'Query executed from reverse direction' }
        }
      } catch (err) {
        continue
      }
    }
  } catch (err) {
    // Ignore reverse join errors
  }

  // All attempts failed
  return {
    data: null,
    error: `Failed to join "${tableName}" with "${joinTable}". Tried multiple join patterns. Possible issues: 1) Foreign key relationship not configured in Supabase, 2) Column names don't match expected patterns, 3) Tables don't have the expected relationship. Error details: Please check if "${joinTable}" has a foreign key column pointing to "${tableName}".`
  }
}
