import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Health check endpoint for monitoring
 * Returns the status of critical services
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}

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

  // Check Deepgram API Key (optional)
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      checks.deepgram = { status: 'error', message: 'API key not configured (optional)' }
    } else {
      checks.deepgram = { status: 'ok' }
    }
  } catch (error) {
    checks.deepgram = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check ElevenLabs API Key (optional)
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      checks.elevenlabs = { status: 'error', message: 'API key not configured (optional)' }
    } else {
      checks.elevenlabs = { status: 'ok' }
    }
  } catch (error) {
    checks.elevenlabs = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Determine overall health
  const criticalServices = ['openai', 'supabase']
  const criticalStatus = criticalServices.every((service) => checks[service]?.status === 'ok')
  const overallStatus = criticalStatus ? 'healthy' : 'degraded'

  const statusCode = criticalStatus ? 200 : 503

  return NextResponse.json(
    {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}

