/**
 * User-friendly error message utilities
 */

/**
 * Get user-friendly error message from database error
 */
export function getUserFriendlyErrorMessage(
  error: any,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'QUERY',
  tableName?: string
): string {
  if (!error) {
    return 'Ein unbekannter Fehler ist aufgetreten.'
  }

  const errorMessage = typeof error === 'string' ? error : (error.message || String(error))
  const errorCode = typeof error === 'object' && error !== null ? (error as any).code : undefined
  const lowerMessage = errorMessage.toLowerCase()

  // Database connection errors
  if (
    lowerMessage.includes('connection') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('econnreset') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound')
  ) {
    return 'Verbindungsfehler zur Datenbank. Bitte versuche es erneut.'
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.'
  }

  // Permission errors
  if (
    lowerMessage.includes('permission denied') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('unauthorized')
  ) {
    return tableName
      ? `Zugriff verweigert auf Tabelle "${tableName}". Bitte überprüfe deine Berechtigungen.`
      : 'Zugriff verweigert. Bitte überprüfe deine Berechtigungen.'
  }

  // Table not found
  if (errorCode === 'PGRST116' || lowerMessage.includes('does not exist') || lowerMessage.includes('nicht gefunden')) {
    return tableName
      ? `Tabelle "${tableName}" existiert nicht oder ist nicht zugänglich.`
      : 'Die angeforderte Tabelle existiert nicht.'
  }

  // Constraint violations
  if (
    lowerMessage.includes('violates') ||
    lowerMessage.includes('constraint') ||
    lowerMessage.includes('unique') ||
    lowerMessage.includes('duplicate')
  ) {
    if (lowerMessage.includes('unique') || lowerMessage.includes('duplicate')) {
      return 'Ein Eintrag mit diesen Daten existiert bereits. Bitte verwende andere Werte.'
    }
    if (lowerMessage.includes('foreign key')) {
      return 'Der Eintrag verweist auf einen nicht existierenden Datensatz. Bitte überprüfe die Referenzen.'
    }
    if (lowerMessage.includes('not null') || lowerMessage.includes('null constraint')) {
      return 'Ein erforderliches Feld fehlt. Bitte fülle alle Pflichtfelder aus.'
    }
    return 'Die Daten verletzen eine Datenbankregel. Bitte überprüfe deine Eingaben.'
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
  }

  // Service unavailable
  if (
    lowerMessage.includes('service unavailable') ||
    lowerMessage.includes('bad gateway') ||
    lowerMessage.includes('gateway timeout')
  ) {
    return 'Der Service ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.'
  }

  // Operation-specific messages
  switch (operation) {
    case 'INSERT':
      if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
        return 'Ein Eintrag mit diesen Daten existiert bereits.'
      }
      return 'Der Eintrag konnte nicht erstellt werden. Bitte überprüfe deine Eingaben.'
    case 'UPDATE':
      if (lowerMessage.includes('not found') || lowerMessage.includes('nicht gefunden')) {
        return 'Der zu aktualisierende Eintrag wurde nicht gefunden.'
      }
      return 'Der Eintrag konnte nicht aktualisiert werden. Bitte überprüfe deine Eingaben.'
    case 'DELETE':
      if (lowerMessage.includes('not found') || lowerMessage.includes('nicht gefunden')) {
        return 'Der zu löschende Eintrag wurde nicht gefunden.'
      }
      if (lowerMessage.includes('foreign key') || lowerMessage.includes('referenced')) {
        return 'Dieser Eintrag kann nicht gelöscht werden, da er von anderen Einträgen referenziert wird.'
      }
      return 'Der Eintrag konnte nicht gelöscht werden.'
    case 'QUERY':
      return 'Die Datenbankabfrage konnte nicht ausgeführt werden. Bitte versuche es erneut.'
  }

  // Default: return sanitized error message in development, generic message in production
  if (process.env.NODE_ENV === 'development') {
    return errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage
  }

  return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
}

