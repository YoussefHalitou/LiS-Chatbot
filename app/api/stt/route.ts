import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen'

if (!DEEPGRAM_API_KEY) {
  throw new Error('DEEPGRAM_API_KEY is not set')
}

/**
 * Infer content type from filename or MIME type
 */
function inferContentType(audioFile: File): string {
  if (audioFile.type) {
    return audioFile.type
  }

  const fileName = audioFile.name.toLowerCase()
  if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4')) {
    return 'audio/mp4'
  }
  if (fileName.endsWith('.ogg')) {
    return 'audio/ogg'
  }
  if (fileName.endsWith('.aac')) {
    return 'audio/aac'
  }
  if (fileName.endsWith('.wav')) {
    return 'audio/wav'
  }
  return 'audio/webm' // Default
}

/**
 * Get user-friendly error message for Deepgram API errors
 */
function getDeepgramErrorMessage(status: number, errorText?: string): string {
  switch (status) {
    case 400:
      return 'Ungültiges Audioformat. Bitte versuche es erneut aufzunehmen.'
    case 401:
      return 'Deepgram API-Authentifizierung fehlgeschlagen. Bitte überprüfe deinen API-Schlüssel.'
    case 413:
      return 'Die Audiodatei ist zu groß. Bitte nimm eine kürzere Nachricht auf.'
    case 429:
      return 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
    case 500:
    case 502:
    case 503:
      return 'Der Spracherkennungsservice ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.'
    default:
      return 'Die Spracherkennung ist fehlgeschlagen. Bitte versuche es erneut.'
  }
}

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(req, '/api/stt')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audiodatei ist erforderlich' },
        { status: 400 }
      )
    }

    // Validate file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: `Audiodatei ist zu groß. Maximale Größe: ${MAX_AUDIO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Die Audiodatei ist leer' },
        { status: 400 }
      )
    }

    // Convert File to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()
    const contentType = inferContentType(audioFile)

    // Build Deepgram API URL with parameters
    const apiUrl = new URL(DEEPGRAM_API_URL)
    apiUrl.searchParams.set('model', 'nova-2')
    apiUrl.searchParams.set('language', 'de')
    apiUrl.searchParams.set('smart_format', 'true')
    apiUrl.searchParams.set('punctuate', 'true')
    
    // Deepgram prefers certain formats - if we have mp4, try to specify encoding
    // For mp4/m4a, Deepgram might need explicit encoding hint
    if (contentType.includes('mp4') || contentType.includes('m4a')) {
      apiUrl.searchParams.set('encoding', 'linear16')
      apiUrl.searchParams.set('sample_rate', '16000')
    }

    // Call Deepgram API - don't set Content-Type header, let Deepgram auto-detect
    // Deepgram works better when it auto-detects the format
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        // Remove Content-Type to let Deepgram auto-detect
      },
      body: audioBuffer,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Deepgram STT error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        contentType,
        fileSize: audioBuffer.byteLength,
        fileName: audioFile.name,
      })
      
      // Log more details for debugging
      try {
        const errorJson = JSON.parse(errorText)
        console.error('Deepgram error details:', errorJson)
      } catch (e) {
        // Not JSON, that's okay
      }
      
      const errorMessage = getDeepgramErrorMessage(response.status, errorText)
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
          details: process.env.NODE_ENV === 'development' ? errorText : undefined,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract transcript with better error handling
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keine Sprache erkannt. Bitte sprich lauter oder näher am Mikrofon.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      transcript: transcript.trim(),
    })
  } catch (error) {
    console.error('STT API error:', error)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.' },
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json(
      {
        error: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
      },
      { status: 500 }
    )
  }
}

