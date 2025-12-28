/**
 * Audit logging for sensitive database operations
 */

export type AuditLogAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'QUERY'

export interface AuditLogEntry {
  timestamp: Date
  action: AuditLogAction
  tableName: string
  userId?: string
  ipAddress?: string
  filters?: Record<string, any>
  values?: Record<string, any>
  result: 'SUCCESS' | 'FAILURE'
  error?: string
  metadata?: Record<string, any>
}

/**
 * Log audit entry (in production, this should write to a database or logging service)
 */
export function logAuditEntry(entry: AuditLogEntry): void {
  // In development, log to console
  // In production, this should write to a secure audit log database or service
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(entry, null, 2))
  } else {
    // TODO: Implement production audit logging
    // Examples:
    // - Write to Supabase audit_log table
    // - Send to logging service (e.g., LogRocket, Sentry)
    // - Write to secure file system
    console.log('[AUDIT]', JSON.stringify({
      ...entry,
      // Sanitize sensitive data in production logs
      values: entry.values ? '[REDACTED]' : undefined,
      filters: entry.filters ? '[REDACTED]' : undefined,
    }))
  }
}

/**
 * Create audit log entry for database operation
 */
export function createAuditLog(
  action: AuditLogAction,
  tableName: string,
  result: 'SUCCESS' | 'FAILURE',
  options: {
    userId?: string
    ipAddress?: string
    filters?: Record<string, any>
    values?: Record<string, any>
    error?: string
    metadata?: Record<string, any>
  } = {}
): AuditLogEntry {
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    action,
    tableName,
    result,
    ...options,
  }

  logAuditEntry(entry)
  return entry
}

