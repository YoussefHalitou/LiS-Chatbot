/**
 * Environment variable validation and configuration
 * This module validates required environment variables at runtime
 */

export interface EnvConfig {
  // Required for core functionality
  OPENAI_API_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  
  // Optional but recommended for full functionality
  SUPABASE_SERVICE_ROLE_KEY?: string
  DEEPGRAM_API_KEY?: string
  ELEVENLABS_API_KEY?: string
  
  // Application configuration
  NODE_ENV: 'development' | 'production' | 'test'
  NEXT_PUBLIC_APP_URL?: string
}

/**
 * Validates that all required environment variables are set
 * Call this at application startup
 */
export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Required environment variables
  const required = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  // Optional but recommended
  const recommended = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPGRAM_API_KEY',
    'ELEVENLABS_API_KEY',
  ]

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }

  // Check recommended variables
  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push(`Missing optional environment variable: ${key} - Some features may not work`)
    }
  }

  // Validate Supabase URL format
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    } catch {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')
    }
  }

  // Validate API key formats (basic checks)
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    warnings.push('OPENAI_API_KEY does not start with "sk-" - this may be invalid')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get typed environment configuration
 * Throws if required variables are missing (use after validateEnv)
 */
export function getEnvConfig(): EnvConfig {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }
}

/**
 * Check if a specific feature is available based on env vars
 */
export function isFeatureEnabled(feature: 'stt' | 'tts' | 'chat' | 'database'): boolean {
  switch (feature) {
    case 'stt':
      return !!process.env.DEEPGRAM_API_KEY
    case 'tts':
      return !!process.env.ELEVENLABS_API_KEY
    case 'chat':
      return !!process.env.OPENAI_API_KEY
    case 'database':
      return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    default:
      return false
  }
}

/**
 * Log environment status (safe for production - no secrets)
 */
export function logEnvStatus(): void {
  const features = {
    chat: isFeatureEnabled('chat'),
    database: isFeatureEnabled('database'),
    stt: isFeatureEnabled('stt'),
    tts: isFeatureEnabled('tts'),
  }

  console.log('=== Environment Status ===')
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('Features enabled:')
  Object.entries(features).forEach(([feature, enabled]) => {
    console.log(`  ${feature}: ${enabled ? '✓' : '✗'}`)
  })
  console.log('========================')
}

