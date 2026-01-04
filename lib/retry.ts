/**
 * Retry logic with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'timeout',
    'network',
    'connection',
    'temporary',
    'transient',
    'rate limit',
    'too many requests',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
  ],
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false

  const errorMessage = (error.message || error.toString() || '').toLowerCase()
  const errorCode = (error.code || '').toLowerCase()

  return retryableErrors.some(
    (retryable) =>
      errorMessage.includes(retryable.toLowerCase()) ||
      errorCode.includes(retryable.toLowerCase())
  )
}

/**
 * Calculate delay for retry attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)
  return Math.min(delay, maxDelayMs)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on last attempt
      if (attempt >= opts.maxAttempts) {
        break
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      )

      console.log(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms:`,
        error instanceof Error ? error.message : String(error)
      )

      await sleep(delay)
    }
  }

  // If we get here, all retries failed
  throw lastError
}

/**
 * Retry a Supabase operation with exponential backoff
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  try {
    return await retryWithBackoff(operation, {
      ...options,
      retryableErrors: [
        ...(options.retryableErrors || []),
        'PGRST',
        'postgres',
        'connection',
        'timeout',
        'network',
      ],
    })
  } catch (error) {
    // Handle Supabase error objects (they have message, code, hint properties)
    if (error && typeof error === 'object') {
      const supabaseError = error as any
      if (supabaseError.message) {
        return {
          data: null,
          error: supabaseError, // Return the full error object, not just the message
        }
      }
    }
    
    return {
      data: null,
      error: error instanceof Error ? error.message : (error || 'Unknown error'),
    }
  }
}

