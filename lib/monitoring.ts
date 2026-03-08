/**
 * Performance Monitoring and Error Tracking
 * 
 * This module provides utilities for monitoring application performance,
 * tracking Core Web Vitals, and reporting errors.
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals'

// Performance thresholds (in milliseconds where applicable)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
}

type MetricRating = 'good' | 'needs-improvement' | 'poor'

/**
 * Rate a metric value against thresholds
 */
function rateMetric(name: keyof typeof THRESHOLDS, value: number): MetricRating {
  const threshold = THRESHOLDS[name]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: Metric & { rating: MetricRating }) {
  // In production, you would send this to your analytics service
  // For now, we'll log it and store in localStorage for debugging

  const metricsLog = JSON.parse(localStorage.getItem('webVitalsLog') || '[]')
  metricsLog.push({
    ...metric,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  })

  // Keep only last 50 metrics
  if (metricsLog.length > 50) {
    metricsLog.shift()
  }

  localStorage.setItem('webVitalsLog', JSON.stringify(metricsLog))

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const color = metric.rating === 'good' ? '#0cce6b' :
      metric.rating === 'needs-improvement' ? '#ffa400' : '#ff4e42'
    console.log(
      `%c[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    )
  }

  // Send to backend if endpoint is configured
  const analyticsEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
  if (analyticsEndpoint) {
    try {
      await fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'web-vital',
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          navigationType: metric.navigationType,
          timestamp: Date.now(),
        }),
        keepalive: true, // Ensure request completes even if page unloads
      })
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.debug('[Analytics] Failed to send metric:', error)
    }
  }
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return

  const reportMetric = (metric: Metric) => {
    const name = metric.name as keyof typeof THRESHOLDS
    const rating = rateMetric(name, metric.value)
    sendToAnalytics({ ...metric, rating })
  }

  // Core Web Vitals
  onLCP(reportMetric)
  onINP(reportMetric)
  onCLS(reportMetric)

  // Additional metrics
  onFCP(reportMetric)
  onTTFB(reportMetric)
}

/**
 * Track custom performance marks
 */
export function trackPerformance(name: string, startMark: string, endMark?: string) {
  if (typeof window === 'undefined' || !window.performance) return

  try {
    if (endMark) {
      performance.measure(name, startMark, endMark)
    } else {
      performance.mark(startMark)
    }
  } catch (error) {
    console.debug('[Performance] Failed to track:', error)
  }
}

/**
 * Track API response times
 */
export function trackApiCall(endpoint: string, startTime: number) {
  const duration = performance.now() - startTime

  const apiMetrics = JSON.parse(localStorage.getItem('apiMetricsLog') || '[]')
  apiMetrics.push({
    endpoint,
    duration,
    timestamp: Date.now(),
  })

  // Keep only last 100 API calls
  if (apiMetrics.length > 100) {
    apiMetrics.shift()
  }

  localStorage.setItem('apiMetricsLog', JSON.stringify(apiMetrics))

  if (process.env.NODE_ENV === 'development') {
    const color = duration < 200 ? '#0cce6b' : duration < 1000 ? '#ffa400' : '#ff4e42'
    console.log(
      `%c[API] ${endpoint}: ${duration.toFixed(0)}ms`,
      `color: ${color};`
    )
  }
}

/**
 * Error tracking and reporting
 */
interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  userAgent: string
  timestamp: number
  metadata?: Record<string, unknown>
}

const errorLog: ErrorReport[] = []

export function reportError(
  error: Error,
  metadata?: Record<string, unknown>,
  componentStack?: string
) {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    componentStack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: Date.now(),
    metadata,
  }

  // Store locally
  errorLog.push(report)
  if (errorLog.length > 20) {
    errorLog.shift()
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Report]', report)
  }

  // Send to Sentry
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.captureException(error, {
      extra: { ...metadata, componentStack },
      tags: {
        url: report.url,
      },
    })
  } catch {
    // Sentry not available — fall through silently
  }
}

/**
 * Get stored metrics for debugging
 */
export function getStoredMetrics() {
  if (typeof window === 'undefined') return { webVitals: [], apiMetrics: [], errors: [] }

  return {
    webVitals: JSON.parse(localStorage.getItem('webVitalsLog') || '[]'),
    apiMetrics: JSON.parse(localStorage.getItem('apiMetricsLog') || '[]'),
    errors: errorLog,
  }
}

/**
 * Clear stored metrics
 */
export function clearStoredMetrics() {
  if (typeof window === 'undefined') return

  localStorage.removeItem('webVitalsLog')
  localStorage.removeItem('apiMetricsLog')
  errorLog.length = 0
}

/**
 * Performance observer for long tasks
 */
export function observeLongTasks(callback?: (duration: number) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration

        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Long Task] Duration: ${duration.toFixed(0)}ms`)
        }

        callback?.(duration)
      }
    })

    observer.observe({ entryTypes: ['longtask'] })

    return () => observer.disconnect()
  } catch (error) {
    // PerformanceObserver not supported
    return () => { }
  }
}

/**
 * Resource timing analysis
 */
export function analyzeResourceTiming() {
  if (typeof window === 'undefined' || !window.performance) return null

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  const analysis = {
    total: resources.length,
    byType: {} as Record<string, number>,
    slowestResources: [] as Array<{ name: string; duration: number }>,
    totalTransferSize: 0,
  }

  for (const resource of resources) {
    // Count by type
    const type = resource.initiatorType || 'other'
    analysis.byType[type] = (analysis.byType[type] || 0) + 1

    // Track transfer size
    analysis.totalTransferSize += resource.transferSize || 0

    // Track slow resources
    const duration = resource.responseEnd - resource.startTime
    if (duration > 500) {
      analysis.slowestResources.push({
        name: resource.name.split('/').pop() || resource.name,
        duration,
      })
    }
  }

  // Sort slowest resources
  analysis.slowestResources.sort((a, b) => b.duration - a.duration)
  analysis.slowestResources = analysis.slowestResources.slice(0, 5)

  return analysis
}

// Auto-initialize when the module loads in browser
if (typeof window !== 'undefined') {
  // Initialize after page load
  if (document.readyState === 'complete') {
    initWebVitals()
  } else {
    window.addEventListener('load', initWebVitals)
  }
}
