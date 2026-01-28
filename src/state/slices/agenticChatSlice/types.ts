export type ToolType = 'swap' | 'send' | 'network_switch' | 'limit_order' | 'cancel_limit_order'

export type PersistedToolState = {
  toolCallId: string
  toolType: ToolType
  conversationId: string
  timestamp: number
  phases: string[]
  meta: Record<string, unknown>
  toolOutput?: unknown
  walletAddress?: string
}

export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  walletAddress?: string
}

export type AgenticChatState = {
  historicalToolIds: string[]
  runtimeToolStates: Record<string, unknown>
  persistedTransactions: PersistedToolState[]
  isChatOpen: boolean
  pendingMessage: string | null
  conversations: Conversation[]
  activeConversationId: string | null
  isChatHistoryOpen: boolean
}
