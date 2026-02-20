import type { UIMessage } from 'ai'

import type { Conversation } from '@/state/slices/agenticChatSlice/types'
import { DEFAULT_CONVERSATION_TITLE } from '@/state/slices/agenticChatSlice/types'

export const generateConversationId = (): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `shapeshift-${timestamp}-${random}`
}

export const extractTitleFromMessages = (
  messages: UIMessage[],
  existingConversation?: Conversation,
): string => {
  if (existingConversation && existingConversation.title !== DEFAULT_CONVERSATION_TITLE) {
    return existingConversation.title
  }

  const firstUserMessage = messages.find(m => m.role === 'user')
  if (!firstUserMessage) return DEFAULT_CONVERSATION_TITLE

  const textPart = firstUserMessage.parts?.find(p => p.type === 'text')
  if (!textPart || textPart.type !== 'text') return DEFAULT_CONVERSATION_TITLE

  const text = textPart.text.trim()
  const maxLength = 50
  if (text.length > maxLength) {
    return `${text.substring(0, maxLength)}...`
  }
  return text || DEFAULT_CONVERSATION_TITLE
}

export const extractToolIds = (messages: UIMessage[]): string[] => {
  const toolIds: string[] = []

  for (const message of messages) {
    if (message.role === 'assistant' && message.parts) {
      for (const part of message.parts) {
        if (part.type === 'tool-call' && part.toolCallId) {
          toolIds.push(part.toolCallId)
        }
      }
    }
  }

  return toolIds
}
