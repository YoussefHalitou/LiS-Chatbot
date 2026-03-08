import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Session Replay — capture 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
        Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
        }),
        Sentry.browserTracingIntegration(),
    ],

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',

    // Filter out noisy errors
    ignoreErrors: [
        'ResizeObserver loop',
        'Network request failed',
        'AbortError',
        'ChunkLoadError',
    ],

    environment: process.env.NODE_ENV,
})
