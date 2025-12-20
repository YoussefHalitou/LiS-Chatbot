import { NextResponse } from 'next/server'

const REQUIRED_ENV_VARS = [
  'INTERNAL_API_KEY',
  'NEXT_PUBLIC_INTERNAL_API_KEY',
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEEPGRAM_API_KEY',
  'ELEVENLABS_API_KEY',
] as const

const OPTIONAL_ENV_VARS = ['ELEVENLABS_VOICE_ID'] as const

type EnvVarKey = (typeof REQUIRED_ENV_VARS)[number]
type OptionalEnvVarKey = (typeof OPTIONAL_ENV_VARS)[number]

type EnvCheck = {
  present: boolean
}

type HealthPayload = {
  status: 'ok' | 'misconfigured'
  timestamp: string
  checks: Record<EnvVarKey, EnvCheck>
  missing: EnvVarKey[]
  optional?: Record<OptionalEnvVarKey, EnvCheck>
}

const buildPresence = <T extends readonly string[]>(keys: T) =>
  keys.reduce(
    (acc, key) => {
      acc[key as T[number]] = {
        present: Boolean(process.env[key]),
      }
      return acc
    },
    {} as Record<T[number], EnvCheck>
  )

export async function GET() {
  const checks = buildPresence(REQUIRED_ENV_VARS)
  const optional = buildPresence(OPTIONAL_ENV_VARS)

  const missing = Object.entries(checks)
    .filter(([, { present }]) => !present)
    .map(([key]) => key as EnvVarKey)

  const status: HealthPayload['status'] = missing.length === 0 ? 'ok' : 'misconfigured'

  const payload: HealthPayload = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    missing,
  }

  if (Object.keys(optional).length > 0) {
    payload.optional = optional
  }

  return NextResponse.json(payload, {
    status: missing.length === 0 ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
