export type ToolType = 'swap' | 'send' | 'network_switch' | 'limit_order' | 'cancel_limit_order'

export type PersistedToolState = {
  toolCallId: string
  toolType: ToolType
  timestamp: number
  phases: string[]
  meta: Record<string, unknown>
  toolOutput?: unknown
  walletAddress?: string
}

export type AgenticChatState = {
  historicalToolIds: string[]
  runtimeToolStates: Record<string, unknown>
  persistedTransactions: PersistedToolState[]
  isChatOpen: boolean
  pendingMessage: string | null
}
