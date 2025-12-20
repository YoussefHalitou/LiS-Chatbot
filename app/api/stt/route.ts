import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY

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
        },
      }
    )
  }

  const rateLimitHeaders = {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toString(),
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    // Convert File to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()

    const MAX_AUDIO_BYTES = 5 * 1024 * 1024 // 5MB
    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Audio file is too large. Please limit recordings to ~30 seconds.' },
        { status: 413, headers: rateLimitHeaders }
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
        { status: 415, headers: rateLimitHeaders }
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
        { status: response.status, headers: rateLimitHeaders }
      )
    }

    const data = await response.json()

    // Extract transcript
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

    if (!transcript) {
      return NextResponse.json(
        { error: 'No speech detected' },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    return NextResponse.json(
      { transcript },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    console.error('STT API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An error occurred',
      },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}

