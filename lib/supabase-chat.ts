/**
 * Supabase Chat Management
 * Handles chat operations with Supabase database and user authentication
 */

import { supabase, supabaseAdmin } from './supabase'
import { Message, Chat } from '@/types'

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  if (!supabase) {
    return { user: null, error: 'Supabase client not initialized' }
  }

  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Get all chats for the current user
 */
export async function getAllChats(): Promise<{ chats: Chat[]; error: string | null }> {
  const { user, error: authError } = await getCurrentUser()
  
  if (authError || !user) {
    return { chats: [], error: authError || 'User not authenticated' }
  }

  if (!supabase) {
    return { chats: [], error: 'Supabase client not initialized' }
  }

  try {
    const { data, error } = await supabase
      .from('t_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return { chats: [], error: error.message }
    }

    const chats: Chat[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messageCount: row.message_count || 0,
    }))

    return { chats, error: null }
  } catch (err) {
    return {
      chats: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(chatId: string): Promise<{ messages: Message[]; error: string | null }> {
  const { user, error: authError } = await getCurrentUser()
  
  if (authError || !user) {
    return { messages: [], error: authError || 'User not authenticated' }
  }

  if (!supabase) {
    return { messages: [], error: 'Supabase client not initialized' }
  }

  try {
    // First verify the chat belongs to the user
    const { data: chat, error: chatError } = await supabase
      .from('t_chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return { messages: [], error: 'Chat not found or access denied' }
    }

    const { data, error } = await supabase
      .from('t_chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true })

    if (error) {
      return { messages: [], error: error.message }
    }

    const messages: Message[] = (data || []).map((row: any) => ({
      role: row.role as 'user' | 'assistant' | 'tool',
      content: row.content,
      timestamp: new Date(row.timestamp),
      tool_calls: row.tool_calls ? JSON.parse(JSON.stringify(row.tool_calls)) : undefined,
      tool_call_id: row.tool_call_id || undefined,
    }))

    return { messages, error: null }
  } catch (err) {
    return {
      messages: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Save messages for a specific chat
 */
export async function saveChatMessages(
  chatId: string,
  messages: Message[]
): Promise<{ error: string | null }> {
  const { user, error: authError } = await getCurrentUser()
  
  if (authError || !user) {
    return { error: authError || 'User not authenticated' }
  }

  if (!supabase) {
    return { error: 'Supabase client not initialized' }
  }

  try {
    // Verify chat exists and belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('t_chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return { error: 'Chat not found or access denied' }
    }

    // Delete existing messages and insert new ones
    // (In production, you might want to do incremental updates)
    const { error: deleteError } = await supabase
      .from('t_chat_messages')
      .delete()
      .eq('chat_id', chatId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    // Insert messages
    const messagesToInsert = messages.map((msg) => ({
      chat_id: chatId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date(),
      tool_calls: msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
      tool_call_id: msg.tool_call_id || null,
    }))

    const { error: insertError } = await supabase
      .from('t_chat_messages')
      .insert(messagesToInsert)

    if (insertError) {
      return { error: insertError.message }
    }

    // Update chat title and updated_at
    const firstUserMessage = messages.find((m) => m.role === 'user')
    const title = firstUserMessage
      ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'Neuer Chat'

    const { error: updateError } = await supabase
      .from('t_chats')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId)

    if (updateError) {
      return { error: updateError.message }
    }

    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Create a new chat
 */
export async function createNewChat(): Promise<{ chat: Chat | null; error: string | null }> {
  const { user, error: authError } = await getCurrentUser()
  
  if (authError || !user) {
    return { chat: null, error: authError || 'User not authenticated' }
  }

  if (!supabase) {
    return { chat: null, error: 'Supabase client not initialized' }
  }

  try {
    const { data, error } = await supabase
      .from('t_chats')
      .insert({
        user_id: user.id,
        title: 'Neuer Chat',
        message_count: 0,
      })
      .select()
      .single()

    if (error) {
      return { chat: null, error: error.message }
    }

    const chat: Chat = {
      id: data.id,
      title: data.title,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      messageCount: data.message_count || 0,
    }

    return { chat, error: null }
  } catch (err) {
    return {
      chat: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string): Promise<{ error: string | null }> {
  const { user, error: authError } = await getCurrentUser()
  
  if (authError || !user) {
    return { error: authError || 'User not authenticated' }
  }

  if (!supabase) {
    return { error: 'Supabase client not initialized' }
  }

  try {
    // Verify chat belongs to user before deleting
    const { error } = await supabase
      .from('t_chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', user.id)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Share a chat with another user
 */
export async function shareChat(
  chatId: string,
  sharedWithUserId: string
): Promise<{ error: string | null }> {
  const { user, error: authError } = await getCurrentUser()
  
  if (authError || !user) {
    return { error: authError || 'User not authenticated' }
  }

  if (!supabase) {
    return { error: 'Supabase client not initialized' }
  }

  try {
    // Get current chat
    const { data: chat, error: chatError } = await supabase
      .from('t_chats')
      .select('shared_with_user_ids')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return { error: 'Chat not found or access denied' }
    }

    // Add user to shared list
    const currentShared = (chat.shared_with_user_ids || []) as string[]
    if (!currentShared.includes(sharedWithUserId)) {
      const updatedShared = [...currentShared, sharedWithUserId]

      const { error: updateError } = await supabase
        .from('t_chats')
        .update({
          is_shared: true,
          shared_with_user_ids: updatedShared,
        })
        .eq('id', chatId)

      if (updateError) {
        return { error: updateError.message }
      }
    }

    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

