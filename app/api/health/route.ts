import { NextResponse } from 'next/server'

const REQUIRED_ENV_VARS = [
  'INTERNAL_API_KEY',
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEEPGRAM_API_KEY',
  'ELEVENLABS_API_KEY',
] as const

type EnvVarKey = (typeof REQUIRED_ENV_VARS)[number]

type EnvCheck = {
  present: boolean
}

const envPresence: Record<EnvVarKey, EnvCheck> = REQUIRED_ENV_VARS.reduce(
  (acc, key) => {
    acc[key] = {
      present: Boolean(process.env[key]),
    }
    return acc
  },
  {} as Record<EnvVarKey, EnvCheck>
)

export async function GET() {
  const missing = Object.entries(envPresence)
    .filter(([, { present }]) => !present)
    .map(([key]) => key)

  const status = missing.length === 0 ? 'ok' : 'misconfigured'

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: envPresence,
      missing,
    },
    {
      status: missing.length === 0 ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
