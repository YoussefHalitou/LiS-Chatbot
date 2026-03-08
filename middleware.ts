import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js Middleware
 *
 * Injects request ID and correlation ID headers for distributed tracing.
 * All API requests get a unique x-request-id; the x-correlation-id is
 * forwarded if present or generated fresh.
 */
export function middleware(request: NextRequest) {
    const requestId = crypto.randomUUID()
    const correlationId =
        request.headers.get('x-correlation-id') || crypto.randomUUID()

    // Clone request headers to add tracing IDs
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-request-id', requestId)
    requestHeaders.set('x-correlation-id', correlationId)

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    })

    // Expose tracing IDs in response headers
    response.headers.set('x-request-id', requestId)
    response.headers.set('x-correlation-id', correlationId)

    return response
}

export const config = {
    matcher: [
        // Match all API routes and pages, but skip static files/images
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
}
