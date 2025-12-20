import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { InMemoryConcurrencyLimiter } from '@/lib/concurrency'
import { detectPii, redactForLogging } from '@/lib/safety'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Default voice: Rachel
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MODERATION_MODEL = 'omni-moderation-latest'

const ttsConcurrencyLimiter = new InMemoryConcurrencyLimiter(6)

let openai: OpenAI | null = null

const getOpenAIClient = () => {
  if (!OPENAI_API_KEY) {
    return null
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  }

  return openai
}

export async function POST(req: NextRequest) {
  if (!INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: 'Server misconfigured: INTERNAL_API_KEY is not set' },
      { status: 500 }
    )
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: 'Server misconfigured: ELEVENLABS_API_KEY is not set' },
      { status: 500 }
    )
  }

  const providedApiKey = req.headers.get('x-api-key')

  if (!providedApiKey || providedApiKey !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = checkRateLimit(req, {
    limit: 30,
    windowMs: 60_000,
    segment: 'tts',
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
          'X-Concurrency-Limit': ttsConcurrencyLimiter.limit.toString(),
        },
      }
    )
  }

  const baseHeaders = {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toString(),
    'X-Concurrency-Limit': ttsConcurrencyLimiter.limit.toString(),
  }

  const concurrency = ttsConcurrencyLimiter.acquire('tts')

  if (!concurrency.allowed) {
    return NextResponse.json(
      { error: 'Too many concurrent text-to-speech requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          ...baseHeaders,
          'Retry-After': '1',
          'X-Concurrency-Active': concurrency.active.toString(),
        },
      }
    )
  }

  try {
    const { text } = await req.json()
    const trimmedText = typeof text === 'string' ? text.trim() : ''

    if (!trimmedText) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400, headers: baseHeaders }
      )
    }

    if (trimmedText.length > 1200) {
      return NextResponse.json(
        { error: 'Text is too long. Please keep requests under 1200 characters.' },
        { status: 413, headers: baseHeaders }
      )
    }

    const piiCheck = detectPii([trimmedText])

    if (piiCheck.flagged) {
      return NextResponse.json(
        {
          error:
            'Die Eingabe enthält sensible personenbezogene Informationen (z.B. E-Mail oder Telefonnummer) und wurde nicht verarbeitet.',
          details: { detected: piiCheck.matches },
        },
        { status: 400, headers: baseHeaders }
      )
    }

    const openaiClient = getOpenAIClient()

    if (!openaiClient) {
      return NextResponse.json(
        { error: 'Server misconfigured: OPENAI_API_KEY is not set' },
        { status: 500, headers: baseHeaders }
      )
    }

    const moderation = await openaiClient.moderations.create({
      model: MODERATION_MODEL,
      input: [trimmedText],
    })

    const flagged = moderation.results?.some((result) => result.flagged)

    if (flagged) {
      return NextResponse.json(
        {
          error:
            'Die Eingabe wurde aufgrund von Sicherheitsregeln blockiert. Bitte formuliere deine Anfrage sachlich und ohne sensible Inhalte.',
        },
        { status: 400, headers: baseHeaders }
      )
    }

    // Call ElevenLabs TTS API
    // ELEVENLABS_API_KEY is checked at module level, so it's safe to use here
    const headers: HeadersInit = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: trimmedText,
          model_id: 'eleven_multilingual_v2', // Supports multiple languages including German
          voice_settings: {
            stability: 0.65, // Higher stability for more consistent speed and delivery
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs TTS error:', error)
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: response.status, headers: baseHeaders }
      )
    }

    // Get audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer()

    // Return audio as base64 or stream
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        ...baseHeaders,
      },
    })
  } catch (error) {
    const status = (error as any)?.status ?? (error as any)?.response?.status
    const code =
      (error as any)?.code ??
      (error as any)?.response?.error?.code ??
      (error as any)?.error?.code

    const message = redactForLogging(error instanceof Error ? error.message : 'Unknown error')

    console.error('TTS API error:', { status, code, message })

    if (status === 401 || code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Server misconfigured: OPENAI_API_KEY is invalid or missing. Please update the key and redeploy.' },
        { status: 401, headers: baseHeaders }
      )
    }

    return NextResponse.json(
      {
        error: 'Upstream provider error. Please verify server API key configuration.',
      },
      { status: 502, headers: baseHeaders }
    )
  } finally {
    concurrency.release?.()
  }
}

