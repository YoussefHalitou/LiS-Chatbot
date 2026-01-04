import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Default voice: Rachel
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const MAX_TEXT_LENGTH = 5000 // ElevenLabs character limit

if (!ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set')
}

/**
 * Get user-friendly error message for ElevenLabs API errors
 */
function getElevenLabsErrorMessage(status: number, errorText?: string): string {
  switch (status) {
    case 400:
      return 'Ungültige Anfrage. Der Text ist möglicherweise zu lang oder enthält ungültige Zeichen.'
    case 401:
      return 'ElevenLabs API-Authentifizierung fehlgeschlagen. Bitte überprüfe deinen API-Schlüssel.'
    case 402:
      return 'Kontingent überschritten. Bitte überprüfe dein ElevenLabs-Konto.'
    case 413:
      return 'Der Text ist zu lang. Bitte verwende einen kürzeren Text.'
    case 429:
      return 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
    case 500:
    case 502:
    case 503:
      return 'Der Sprachsyntheseservice ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.'
    default:
      return 'Die Audioausgabe konnte nicht erzeugt werden. Bitte versuche es erneut.'
  }
}

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(req, '/api/tts')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text ist erforderlich' },
        { status: 400 }
      )
    }

    // Validate text length
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text ist zu lang. Maximale Länge: ${MAX_TEXT_LENGTH} Zeichen` },
        { status: 400 }
      )
    }

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text darf nicht leer sein' },
        { status: 400 }
      )
    }

    // Call ElevenLabs TTS API
    // ELEVENLABS_API_KEY is checked at module level, so it's safe to use here
    const headers: HeadersInit = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!,
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_multilingual_v2', // Supports multiple languages including German
          voice_settings: {
            stability: 0.65, // Higher stability for more consistent speed and delivery
            similarity_boost: 0.75,
          },
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('ElevenLabs TTS error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        textLength: text.length,
      })
      
      const errorMessage = getElevenLabsErrorMessage(response.status, errorText)
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
        },
        { status: response.status }
      )
    }

    // Get audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer()

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'Die Audioausgabe ist leer' },
        { status: 500 }
      )
    }

    // Return audio as stream
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('TTS API error:', error)
    
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

