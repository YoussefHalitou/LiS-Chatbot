/**
 * Structured Logger — Pino-based
 *
 * Provides request-scoped child loggers with request IDs and correlation IDs.
 * Uses JSON output in production and pretty-printing in development.
 */

import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Root logger instance
 */
const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    ...(isProduction
        ? {
            // Production: structured JSON
            formatters: {
                level(label: string) {
                    return { level: label }
                },
            },
            timestamp: pino.stdTimeFunctions.isoTime,
        }
        : {
            // Development: pretty-print
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }),
})

/**
 * Create a child logger bound to a specific API request.
 *
 * @param requestId  Unique ID for this request (from x-request-id header)
 * @param correlationId  Correlation ID spanning multiple requests (from x-correlation-id)
 * @param extra  Additional fields to bind (e.g., userId, route)
 */
export function createRequestLogger(
    requestId: string,
    correlationId?: string,
    extra?: Record<string, unknown>
) {
    return logger.child({
        requestId,
        ...(correlationId ? { correlationId } : {}),
        ...extra,
    })
}

/**
 * Create a child logger namespaced to a module.
 *
 * @param module  Module name, e.g. 'auth', 'chat', 'supabase'
 */
export function createModuleLogger(module: string) {
    return logger.child({ module })
}

export default logger
