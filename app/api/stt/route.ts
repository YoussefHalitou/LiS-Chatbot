import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { InMemoryConcurrencyLimiter } from '@/lib/concurrency'
import { detectPii, redactForLogging } from '@/lib/safety'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MODERATION_MODEL = 'omni-moderation-latest'

const sttConcurrencyLimiter = new InMemoryConcurrencyLimiter(4)

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

  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { error: 'Server misconfigured: DEEPGRAM_API_KEY is not set' },
      { status: 500 }
    )
  }

  const providedApiKey = req.headers.get('x-api-key')

  if (!providedApiKey || providedApiKey !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = checkRateLimit(req, {
    limit: 20,
    windowMs: 60_000,
    segment: 'stt',
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
          'X-Concurrency-Limit': sttConcurrencyLimiter.limit.toString(),
        },
      }
    )
  }

  const baseHeaders = {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toString(),
    'X-Concurrency-Limit': sttConcurrencyLimiter.limit.toString(),
  }

  const concurrency = sttConcurrencyLimiter.acquire('stt')

  if (!concurrency.allowed) {
    return NextResponse.json(
      { error: 'Too many concurrent speech-to-text requests. Please try again in a moment.' },
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
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400, headers: baseHeaders }
      )
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400, headers: baseHeaders }
      )
    }

    // Convert File to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()

    const MAX_AUDIO_BYTES = 5 * 1024 * 1024 // 5MB
    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Audio file is too large. Please limit recordings to ~30 seconds.' },
        { status: 413, headers: baseHeaders }
      )
    }

    // Determine content type - Deepgram needs the correct MIME type
    let contentType = audioFile.type
    const allowedMimeTypes = new Set([
      'audio/webm',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/aac',
      'audio/wav',
      'audio/mpeg',
    ])

    if (!contentType) {
      // Try to infer from filename or default to webm
      const fileName = audioFile.name.toLowerCase()
      if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4')) {
        contentType = 'audio/mp4'
      } else if (fileName.endsWith('.ogg')) {
        contentType = 'audio/ogg'
      } else if (fileName.endsWith('.aac')) {
        contentType = 'audio/aac'
      } else {
        contentType = 'audio/webm' // Default
      }
    }

    if (!allowedMimeTypes.has(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Please upload webm, mp4/m4a, ogg, wav, aac, or mp3 audio.' },
        { status: 415, headers: baseHeaders }
      )
    }

    // Call Deepgram API directly
    // Deepgram supports various audio formats: webm, mp4, m4a, ogg, wav, etc.
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=de&smart_format=true&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': contentType,
      },
      body: audioBuffer,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Deepgram STT error:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        contentType: contentType,
        fileSize: audioBuffer.byteLength,
      })
      
      let errorMessage = 'Failed to transcribe audio'
      if (response.status === 400) {
        errorMessage = 'Invalid audio format. Please try recording again.'
      } else if (response.status === 401) {
        errorMessage = 'Deepgram API authentication failed. Please check your API key.'
      } else if (response.status === 413) {
        errorMessage = 'Audio file is too large. Please record a shorter message.'
      }
      
      return NextResponse.json(
        { error: errorMessage, details: error },
        { status: response.status, headers: baseHeaders }
      )
    }

    const data = await response.json()

    // Extract transcript
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

    if (!transcript) {
      return NextResponse.json(
        { error: 'No speech detected' },
        { status: 400, headers: baseHeaders }
      )
    }

    const piiCheck = detectPii([transcript])

    if (piiCheck.flagged) {
      return NextResponse.json(
        {
          error:
            'Die Transkription enthält sensible personenbezogene Informationen (z.B. E-Mail oder Telefonnummer) und wurde nicht verarbeitet.',
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
      input: [transcript],
    })

    const flagged = moderation.results?.some((result) => result.flagged)

    if (flagged) {
      return NextResponse.json(
        {
          error:
            'Die Transkription wurde aufgrund von Sicherheitsregeln blockiert. Bitte formuliere deine Anfrage sachlich und ohne sensible Inhalte.',
        },
        { status: 400, headers: baseHeaders }
      )
    }

    return NextResponse.json(
      { transcript },
      { headers: baseHeaders }
    )
  } catch (error) {
    const status = (error as any)?.status ?? (error as any)?.response?.status
    const code =
      (error as any)?.code ??
      (error as any)?.response?.error?.code ??
      (error as any)?.error?.code

    const message = redactForLogging(error instanceof Error ? error.message : 'Unknown error')

    console.error('STT API error:', { status, code, message })

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

