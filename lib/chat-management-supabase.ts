/**
 * Supabase Chat Management
 * Wrapper around Supabase chat functions with localStorage fallback
 */

import { Message, Chat } from '@/types'
import {
  getAllChats as getAllChatsSupabase,
  getChatMessages as getChatMessagesSupabase,
  saveChatMessages as saveChatMessagesSupabase,
  createNewChat as createNewChatSupabase,
  deleteChat as deleteChatSupabase,
  getCurrentUser,
} from './supabase-chat'
import {
  getAllChats as getAllChatsLocal,
  getChatMessages as getChatMessagesLocal,
  saveChatMessages as saveChatMessagesLocal,
  createNewChat as createNewChatLocal,
  deleteChat as deleteChatLocal,
  getCurrentChatId as getCurrentChatIdLocal,
  setCurrentChatId as setCurrentChatIdLocal,
} from './chat-management'

/**
 * Check if user is authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  const { user } = await getCurrentUser()
  return !!user
}

/**
 * Get all chats (Supabase if authenticated, localStorage otherwise)
 */
export async function getAllChats(): Promise<Chat[]> {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    const { chats, error } = await getAllChatsSupabase()
    if (!error) {
      return chats
    }
    console.warn('Failed to load chats from Supabase, falling back to localStorage:', error)
  }
  return getAllChatsLocal()
}

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(chatId: string): Promise<Message[]> {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    const { messages, error } = await getChatMessagesSupabase(chatId)
    if (!error) {
      return messages
    }
    console.warn('Failed to load messages from Supabase, falling back to localStorage:', error)
  }
  return getChatMessagesLocal(chatId)
}

/**
 * Save messages for a specific chat
 */
export async function saveChatMessages(chatId: string, messages: Message[]): Promise<void> {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    const { error } = await saveChatMessagesSupabase(chatId, messages)
    if (!error) {
      return
    }
    console.warn('Failed to save messages to Supabase, falling back to localStorage:', error)
  }
  saveChatMessagesLocal(chatId, messages)
}

/**
 * Create a new chat
 */
export async function createNewChat(): Promise<Chat> {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    const { chat, error } = await createNewChatSupabase()
    if (!error && chat) {
      return chat
    }
    console.warn('Failed to create chat in Supabase, falling back to localStorage:', error)
  }
  return createNewChatLocal()
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string): Promise<void> {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    const { error } = await deleteChatSupabase(chatId)
    if (!error) {
      return
    }
    console.warn('Failed to delete chat from Supabase, falling back to localStorage:', error)
  }
  deleteChatLocal(chatId)
}

/**
 * Get current chat ID (localStorage only, as it's client-side state)
 */
export function getCurrentChatId(): string | null {
  return getCurrentChatIdLocal()
}

/**
 * Set current chat ID (localStorage only, as it's client-side state)
 */
export function setCurrentChatId(chatId: string): void {
  setCurrentChatIdLocal(chatId)
}

