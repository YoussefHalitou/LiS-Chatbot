/**
 * API Route for Chat Messages
 * Handles getting and saving messages for a specific chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { getChatMessages, saveChatMessages } from '@/lib/supabase-chat'

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params
    const { messages, error } = await getChatMessages(chatId)

    if (error) {
      return NextResponse.json(
        { error },
        { status: 401 }
      )
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params
    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const { error } = await saveChatMessages(chatId, messages)

    if (error) {
      return NextResponse.json(
        { error },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving messages:', error)
    return NextResponse.json(
      { error: 'Failed to save messages' },
      { status: 500 }
    )
  }
}

