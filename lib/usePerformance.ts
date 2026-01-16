'use client'

import { useEffect, useCallback, useRef } from 'react'
import { trackApiCall, trackPerformance, reportError, observeLongTasks } from './monitoring'

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)
  const mountTime = useRef(0)

  useEffect(() => {
    mountTime.current = performance.now()
    renderCount.current = 0
    
    trackPerformance(`${componentName}-mount`, `${componentName}-mount-start`)
    
    return () => {
      const totalTime = performance.now() - mountTime.current
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Performance] ${componentName}: ${renderCount.current} renders, ${totalTime.toFixed(0)}ms total`
        )
      }
    }
  }, [componentName])

  useEffect(() => {
    renderCount.current += 1
  })

  return { renderCount: renderCount.current }
}

/**
 * Hook for tracking async operation performance
 */
export function useAsyncPerformance() {
  const track = useCallback(async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      trackApiCall(name, startTime)
      return result
    } catch (error) {
      trackApiCall(`${name} (failed)`, startTime)
      throw error
    }
  }, [])

  return { track }
}

/**
 * Hook for error boundary reporting
 */
export function useErrorReporting() {
  const report = useCallback((error: Error, metadata?: Record<string, unknown>) => {
    reportError(error, metadata)
  }, [])

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught',
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandled-rejection' }
      )
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return { report }
}

/**
 * Hook for observing long tasks
 */
export function useLongTaskObserver(threshold = 50) {
  useEffect(() => {
    const cleanup = observeLongTasks((duration) => {
      if (duration > threshold) {
        // Long task detected - could trigger UI feedback
        console.warn(`Long task detected: ${duration}ms`)
      }
    })

    return cleanup
  }, [threshold])
}

/**
 * Hook for measuring interaction timing
 */
export function useInteractionTiming() {
  const startInteraction = useCallback((name: string) => {
    const markName = `interaction-${name}-start`
    performance.mark(markName)
    
    return () => {
      const endMarkName = `interaction-${name}-end`
      performance.mark(endMarkName)
      
      try {
        performance.measure(`interaction-${name}`, markName, endMarkName)
        const measures = performance.getEntriesByName(`interaction-${name}`)
        const lastMeasure = measures[measures.length - 1]
        
        if (process.env.NODE_ENV === 'development' && lastMeasure) {
          console.log(`[Interaction] ${name}: ${lastMeasure.duration.toFixed(0)}ms`)
        }
        
        // Cleanup
        performance.clearMarks(markName)
        performance.clearMarks(endMarkName)
        performance.clearMeasures(`interaction-${name}`)
      } catch (e) {
        // Silently fail
      }
    }
  }, [])

  return { startInteraction }
}
