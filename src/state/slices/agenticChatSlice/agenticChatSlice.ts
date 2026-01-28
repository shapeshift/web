import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

import type { AgenticChatState, Conversation, PersistedToolState } from './types'

const MAX_PERSISTED_TRANSACTIONS = 500

const initialState: AgenticChatState = {
  historicalToolIds: [],
  runtimeToolStates: {},
  persistedTransactions: [],
  isChatOpen: false,
  pendingMessage: null,
  conversations: [],
  activeConversationId: null,
  isChatHistoryOpen: false,
}

export const agenticChatSlice = createSlice({
  name: 'agenticChat',
  initialState,
  reducers: {
    markAsHistorical: (state, action: PayloadAction<string[]>) => {
      const newIds = action.payload.filter(id => !state.historicalToolIds.includes(id))
      state.historicalToolIds.push(...newIds)
    },
    clearHistoricalTools: state => {
      state.historicalToolIds = []
    },
    initializeRuntimeState: (
      state,
      action: PayloadAction<{ toolCallId: string; state: unknown }>,
    ) => {
      const { toolCallId, state: toolState } = action.payload
      if (!(toolCallId in state.runtimeToolStates)) {
        state.runtimeToolStates[toolCallId] = toolState
      }
    },
    setRuntimeState: (state, action: PayloadAction<{ toolCallId: string; state: unknown }>) => {
      const { toolCallId, state: toolState } = action.payload
      state.runtimeToolStates[toolCallId] = toolState
    },
    clearRuntimeState: (state, action: PayloadAction<string>) => {
      delete state.runtimeToolStates[action.payload]
    },
    persistTransaction: (state, action: PayloadAction<PersistedToolState>) => {
      const existingIndex = state.persistedTransactions.findIndex(
        tx => tx.toolCallId === action.payload.toolCallId,
      )

      if (existingIndex >= 0) {
        state.persistedTransactions[existingIndex] = action.payload
      } else {
        state.persistedTransactions.push(action.payload)
      }

      // Sort by timestamp (newest first) and limit to MAX_PERSISTED_TRANSACTIONS
      state.persistedTransactions.sort((a, b) => b.timestamp - a.timestamp)
      if (state.persistedTransactions.length > MAX_PERSISTED_TRANSACTIONS) {
        state.persistedTransactions = state.persistedTransactions.slice(
          0,
          MAX_PERSISTED_TRANSACTIONS,
        )
      }
    },
    openChat: (state, action: PayloadAction<string | undefined>) => {
      state.isChatOpen = true
      state.pendingMessage = action.payload ?? null
    },
    endChat: state => {
      state.isChatOpen = false
      state.pendingMessage = null
    },
    clearPendingMessage: state => {
      state.pendingMessage = null
    },
    openChatHistory: state => {
      state.isChatHistoryOpen = true
    },
    closeChatHistory: state => {
      state.isChatHistoryOpen = false
    },
    createConversation: (
      state,
      action: PayloadAction<{ id: string; title?: string; walletAddress?: string }>,
    ) => {
      const { id, title = 'New Conversation', walletAddress } = action.payload
      const now = new Date().toISOString()
      state.conversations.push({
        id,
        title,
        createdAt: now,
        updatedAt: now,
        walletAddress,
      })
      state.activeConversationId = id
    },
    updateConversation: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Conversation> }>,
    ) => {
      const { id, updates } = action.payload
      const conversation = state.conversations.find(c => c.id === id)
      if (conversation) {
        Object.assign(conversation, updates)
        conversation.updatedAt = new Date().toISOString()
      }
    },
    deleteConversation: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload
      state.conversations = state.conversations.filter(c => c.id !== conversationId)
      state.persistedTransactions = state.persistedTransactions.filter(
        tx => tx.conversationId !== conversationId,
      )
      if (state.activeConversationId === conversationId) {
        const sortedConversations = state.conversations
          .slice()
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        state.activeConversationId = sortedConversations[0]?.id ?? null
      }
    },
    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload
    },
    clearConversations: state => {
      state.conversations = []
      state.activeConversationId = null
    },
    clear: state => {
      state.historicalToolIds = []
      state.runtimeToolStates = {}
      state.persistedTransactions = []
      state.isChatOpen = false
      state.pendingMessage = null
      state.conversations = []
      state.activeConversationId = null
      state.isChatHistoryOpen = false
    },
  },
  selectors: {
    selectHistoricalToolIds: state => state.historicalToolIds,
    selectRuntimeToolStates: state => state.runtimeToolStates,
    selectPersistedTransactions: state => state.persistedTransactions,
    selectRuntimeState: (state, toolCallId: string) => state.runtimeToolStates[toolCallId],
    selectPersistedTransaction: (state, toolCallId: string) =>
      state.persistedTransactions.find(tx => tx.toolCallId === toolCallId),
    selectIsHistorical: (state, toolCallId: string) => state.historicalToolIds.includes(toolCallId),
    selectHasRuntimeState: (state, toolCallId: string) => toolCallId in state.runtimeToolStates,
    selectIsChatOpen: state => state.isChatOpen,
    selectPendingMessage: state => state.pendingMessage,
    selectConversations: state => state.conversations,
    selectActiveConversationId: state => state.activeConversationId,
    selectIsChatHistoryOpen: state => state.isChatHistoryOpen,
    selectActiveConversation: state =>
      state.conversations.find(c => c.id === state.activeConversationId),
  },
})
