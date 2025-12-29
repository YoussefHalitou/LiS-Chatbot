/**
 * API Route for Chat Management
 * Handles CRUD operations for chats
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAllChats, createNewChat, deleteChat } from '@/lib/supabase-chat'

export async function GET(req: NextRequest) {
  try {
    const { chats, error } = await getAllChats()

    if (error) {
      return NextResponse.json(
        { error },
        { status: 401 }
      )
    }

    return NextResponse.json({ chats })
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { chat, error } = await createNewChat()

    if (error) {
      return NextResponse.json(
        { error },
        { status: 401 }
      )
    }

    return NextResponse.json({ chat })
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId is required' },
        { status: 400 }
      )
    }

    const { error } = await deleteChat(chatId)

    if (error) {
      return NextResponse.json(
        { error },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    )
  }
}

