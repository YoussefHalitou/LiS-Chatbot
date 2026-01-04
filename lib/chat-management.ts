/**
 * Chat Management Utilities
 * Handles multi-chat functionality with localStorage
 */

import { Message, Chat } from '@/types'
import { APP_CONFIG } from './constants'

/**
 * Generate a unique chat ID
 */
export function generateChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get chat storage key for a specific chat
 */
function getChatStorageKey(chatId: string): string {
  return `${APP_CONFIG.CHAT_HISTORY_KEY}-${chatId}`
}

/**
 * Get all chats from localStorage
 */
export function getAllChats(): Chat[] {
  if (typeof window === 'undefined') return []
  
  try {
    const chatsJson = localStorage.getItem(APP_CONFIG.CHAT_LIST_KEY)
    if (!chatsJson) return []
    
    const chats = JSON.parse(chatsJson) as Chat[]
    return chats.map(chat => ({
      ...chat,
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
    }))
  } catch (e) {
    console.error('Failed to load chats:', e)
    return []
  }
}

/**
 * Save chat list to localStorage
 */
export function saveChatList(chats: Chat[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(APP_CONFIG.CHAT_LIST_KEY, JSON.stringify(chats))
  } catch (e) {
    console.error('Failed to save chat list:', e)
  }
}

/**
 * Get messages for a specific chat
 */
export function getChatMessages(chatId: string): Message[] {
  if (typeof window === 'undefined') return []
  
  try {
    const messagesJson = localStorage.getItem(getChatStorageKey(chatId))
    if (!messagesJson) return []
    
    const messages = JSON.parse(messagesJson) as Message[]
    return messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }))
  } catch (e) {
    console.error('Failed to load chat messages:', e)
    return []
  }
}

/**
 * Save messages for a specific chat
 */
export function saveChatMessages(chatId: string, messages: Message[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const messagesToStore = messages.slice(-APP_CONFIG.MAX_MESSAGES_TO_STORE)
    localStorage.setItem(getChatStorageKey(chatId), JSON.stringify(messagesToStore))
    
    // Update chat metadata
    const chats = getAllChats()
    const chatIndex = chats.findIndex(c => c.id === chatId)
    
    if (chatIndex >= 0) {
      chats[chatIndex] = {
        ...chats[chatIndex],
        updatedAt: new Date(),
        messageCount: messages.length,
        title: generateChatTitle(messages),
      }
    } else {
      // Chat doesn't exist, create it
      chats.push({
        id: chatId,
        title: generateChatTitle(messages),
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: messages.length,
      })
    }
    
    saveChatList(chats)
  } catch (e) {
    console.error('Failed to save chat messages:', e)
  }
}

/**
 * Create a new chat
 */
export function createNewChat(): Chat {
  const chatId = generateChatId()
  const newChat: Chat = {
    id: chatId,
    title: 'Neuer Chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 0,
  }
  
  const chats = getAllChats()
  chats.unshift(newChat) // Add to beginning
  saveChatList(chats)
  
  // Set as current chat
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_CONFIG.CURRENT_CHAT_ID_KEY, chatId)
  }
  
  return newChat
}

/**
 * Delete a chat
 */
export function deleteChat(chatId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    // Remove messages
    localStorage.removeItem(getChatStorageKey(chatId))
    
    // Remove from chat list
    const chats = getAllChats().filter(c => c.id !== chatId)
    saveChatList(chats)
    
    // If this was the current chat, switch to first available or create new
    const currentChatId = localStorage.getItem(APP_CONFIG.CURRENT_CHAT_ID_KEY)
    if (currentChatId === chatId) {
      if (chats.length > 0) {
        localStorage.setItem(APP_CONFIG.CURRENT_CHAT_ID_KEY, chats[0].id)
      } else {
        localStorage.removeItem(APP_CONFIG.CURRENT_CHAT_ID_KEY)
      }
    }
  } catch (e) {
    console.error('Failed to delete chat:', e)
  }
}

/**
 * Get current chat ID
 */
export function getCurrentChatId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(APP_CONFIG.CURRENT_CHAT_ID_KEY)
}

/**
 * Set current chat ID
 */
export function setCurrentChatId(chatId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(APP_CONFIG.CURRENT_CHAT_ID_KEY, chatId)
}

/**
 * Generate a chat title from messages
 */
function generateChatTitle(messages: Message[]): string {
  // Get first user message
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim()
    // Use first 50 characters as title
    return content.length > 50 ? content.substring(0, 50) + '...' : content
  }
  return 'Neuer Chat'
}

/**
 * Migrate old chat format to new multi-chat format
 */
export function migrateOldChatFormat(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    // Check if old format exists
    const oldMessages = localStorage.getItem(APP_CONFIG.CHAT_HISTORY_KEY)
    if (!oldMessages) return null
    
    // Check if already migrated
    const chats = getAllChats()
    if (chats.length > 0) {
      // Already migrated, remove old format
      localStorage.removeItem(APP_CONFIG.CHAT_HISTORY_KEY)
      return null
    }
    
    // Migrate old messages to new format
    const messages = JSON.parse(oldMessages) as Message[]
    if (messages.length === 0) return null
    
    const chatId = generateChatId()
    const migratedChat: Chat = {
      id: chatId,
      title: generateChatTitle(messages),
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: messages.length,
    }
    
    // Save migrated chat
    saveChatMessages(chatId, messages)
    const updatedChats = getAllChats()
    updatedChats.unshift(migratedChat)
    saveChatList(updatedChats)
    
    // Set as current
    setCurrentChatId(chatId)
    
    // Remove old format
    localStorage.removeItem(APP_CONFIG.CHAT_HISTORY_KEY)
    
    return chatId
  } catch (e) {
    console.error('Failed to migrate old chat format:', e)
    return null
  }
}

