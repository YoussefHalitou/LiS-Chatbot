import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Get version from package.json at build time
const APP_VERSION = process.env.npm_package_version || '0.1.0'

/**
 * Health check endpoint for monitoring
 * GET /api/health
 * 
 * Returns the status of critical services for monitoring systems
 * Used by: Vercel, load balancers, uptime monitors
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'ok' | 'error' | 'warning'; message?: string; latency?: number }> = {}

  // Check OpenAI API Key
  try {
    if (!process.env.OPENAI_API_KEY) {
      checks.openai = { status: 'error', message: 'API key not configured' }
    } else {
      checks.openai = { status: 'ok' }
    }
  } catch (error) {
    checks.openai = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check Supabase connection
  try {
    if (!supabaseAdmin) {
      checks.supabase = { status: 'error', message: 'Supabase client not initialized' }
    } else {
      // Try a simple query to verify connection
      const { error } = await supabaseAdmin.from('t_employees').select('employee_id').limit(1)
      if (error) {
        checks.supabase = {
          status: 'error',
          message: error.message,
        }
      } else {
        checks.supabase = { status: 'ok' }
      }
    }
  } catch (error) {
    checks.supabase = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  }

  // Check Deepgram API Key (optional - for STT)
  if (!process.env.DEEPGRAM_API_KEY) {
    checks.deepgram = { status: 'warning', message: 'API key not configured - Speech-to-Text disabled' }
  } else {
    checks.deepgram = { status: 'ok' }
  }

  // Check ElevenLabs API Key (optional - for TTS)
  if (!process.env.ELEVENLABS_API_KEY) {
    checks.elevenlabs = { status: 'warning', message: 'API key not configured - Text-to-Speech disabled' }
  } else {
    checks.elevenlabs = { status: 'ok' }
  }

  // Calculate total latency
  const totalLatency = Date.now() - startTime

  // Determine overall health
  const criticalServices = ['openai', 'supabase']
  const criticalStatus = criticalServices.every((service) => checks[service]?.status === 'ok')
  const hasWarnings = Object.values(checks).some((check) => check.status === 'warning')
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  let statusCode: number
  
  if (!criticalStatus) {
    overallStatus = 'unhealthy'
    statusCode = 503
  } else if (hasWarnings) {
    overallStatus = 'degraded'
    statusCode = 200
  } else {
    overallStatus = 'healthy'
    statusCode = 200
  }

  return NextResponse.json(
    {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      latency: `${totalLatency}ms`,
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Response-Time': `${totalLatency}ms`,
      },
    }
  )
}

