import type { UIMessage } from 'ai'

const getStorageKey = (conversationId: string): string => `ai-chat-messages-${conversationId}`

export const saveMessages = (conversationId: string, messages: UIMessage[]): void => {
  try {
    const key = getStorageKey(conversationId)
    localStorage.setItem(key, JSON.stringify(messages))
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error)
  }
}

export const loadMessages = (conversationId: string): UIMessage[] => {
  try {
    const key = getStorageKey(conversationId)
    const stored = localStorage.getItem(key)
    if (!stored) return []
    return JSON.parse(stored) as UIMessage[]
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error)
    return []
  }
}

export const deleteMessages = (conversationId: string): void => {
  try {
    const key = getStorageKey(conversationId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to delete messages from localStorage:', error)
  }
}
