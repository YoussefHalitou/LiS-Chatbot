/**
 * Input validation and sanitization utilities for database operations
 */

/**
 * Validate table name against whitelist
 */
export function validateTableName(tableName: string, allowedTables: Set<string>): {
  valid: boolean
  error?: string
} {
  if (!tableName || typeof tableName !== 'string') {
    return { valid: false, error: 'Table name must be a non-empty string' }
  }

  // Prevent SQL injection attempts
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    return { valid: false, error: 'Invalid table name format' }
  }

  if (!allowedTables.has(tableName)) {
    return { valid: false, error: `Table "${tableName}" is not allowed` }
  }

  return { valid: true }
}

/**
 * Sanitize and validate filter values
 */
export function sanitizeFilterValue(value: any): any {
  if (value === null || value === undefined) {
    return null
  }

  // If it's a filter object with type and value
  if (typeof value === 'object' && !Array.isArray(value) && value.type) {
    const sanitized = { ...value }
    
    // Validate filter type
    const allowedTypes = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'like', 'ilike', 'in']
    if (!allowedTypes.includes(value.type)) {
      throw new Error(`Invalid filter type: ${value.type}`)
    }

    // Sanitize the actual value
    sanitized.value = sanitizeValue(value.value)
    return sanitized
  }

  // Simple value - sanitize it
  return sanitizeValue(value)
}

/**
 * Sanitize a single value
 */
function sanitizeValue(value: any): any {
  if (value === null || value === undefined) {
    return null
  }

  // String values - prevent SQL injection
  if (typeof value === 'string') {
    // Limit string length to prevent DoS
    if (value.length > 10000) {
      throw new Error('String value exceeds maximum length')
    }
    // Remove null bytes and other dangerous characters
    return value.replace(/\0/g, '').trim()
  }

  // Number values
  if (typeof value === 'number') {
    if (!isFinite(value)) {
      throw new Error('Invalid number value')
    }
    return value
  }

  // Boolean values
  if (typeof value === 'boolean') {
    return value
  }

  // Date values
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Array values (for IN filters)
  if (Array.isArray(value)) {
    if (value.length > 1000) {
      throw new Error('Array value exceeds maximum length')
    }
    return value.map(sanitizeValue)
  }

  // Object values - recursively sanitize
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      // Validate key name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid key name: ${key}`)
      }
      sanitized[key] = sanitizeValue(val)
    }
    return sanitized
  }

  return value
}

/**
 * Validate and sanitize filter object
 */
export function sanitizeFilters(filters: Record<string, any>): {
  valid: boolean
  sanitized?: Record<string, any>
  error?: string
} {
  if (!filters || typeof filters !== 'object') {
    return { valid: false, error: 'Filters must be an object' }
  }

  try {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(filters)) {
      // Validate key name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return { valid: false, error: `Invalid filter key: ${key}` }
      }

      // Limit number of filters to prevent DoS
      if (Object.keys(sanitized).length >= 50) {
        return { valid: false, error: 'Too many filters' }
      }

      sanitized[key] = sanitizeFilterValue(value)
    }

    return { valid: true, sanitized }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid filter value'
    }
  }
}

/**
 * Validate and sanitize values for insert/update operations
 */
export function sanitizeValues(values: Record<string, any>): {
  valid: boolean
  sanitized?: Record<string, any>
  error?: string
} {
  if (!values || typeof values !== 'object') {
    return { valid: false, error: 'Values must be an object' }
  }

  try {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(values)) {
      // Validate key name (column name)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return { valid: false, error: `Invalid column name: ${key}` }
      }

      // Limit number of columns to prevent DoS
      if (Object.keys(sanitized).length >= 100) {
        return { valid: false, error: 'Too many columns' }
      }

      sanitized[key] = sanitizeValue(value)
    }

    return { valid: true, sanitized }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid value'
    }
  }
}

/**
 * Validate that filters identify exactly one row (for updates/deletes)
 */
export function validateSingleRowFilters(filters: Record<string, any>): {
  valid: boolean
  error?: string
} {
  if (!filters || Object.keys(filters).length === 0) {
    return { valid: false, error: 'Filters are required' }
  }

  // Check if we have at least one unique identifier
  // Common unique identifiers in the schema
  const uniqueIdentifiers = [
    'project_id', 'employee_id', 'vehicle_id', 'plan_id',
    'project_code', 'name', 'employee_code', 'vehicle_nickname'
  ]

  const hasUniqueIdentifier = Object.keys(filters).some(key => 
    uniqueIdentifiers.includes(key.toLowerCase())
  )

  if (!hasUniqueIdentifier) {
    return {
      valid: false,
      error: 'Filters must include at least one unique identifier (e.g., project_id, employee_id, project_code, name)'
    }
  }

  return { valid: true }
}

/**
 * Validate date format
 */
export function validateDate(dateString: string): {
  valid: boolean
  error?: string
  parsed?: Date
} {
  if (!dateString || typeof dateString !== 'string') {
    return { valid: false, error: 'Date must be a string' }
  }

  // ISO date format: YYYY-MM-DD
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!isoDateRegex.test(dateString)) {
    return { valid: false, error: 'Date must be in ISO format (YYYY-MM-DD)' }
  }

  const parsed = new Date(dateString)
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid date' }
  }

  return { valid: true, parsed }
}

