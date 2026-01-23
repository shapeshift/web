import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

import type { AgenticChatState, PersistedToolState } from './types'

const MAX_PERSISTED_TRANSACTIONS = 500

const initialState: AgenticChatState = {
  historicalToolIds: [],
  runtimeToolStates: {},
  persistedTransactions: [],
  isChatOpen: false,
  pendingMessage: null,
}

export const agenticChatSlice = createSlice({
  name: 'agenticChat',
  initialState,
  reducers: {
    markAsHistorical: (state, action: PayloadAction<string[]>) => {
      const newIds = action.payload.filter(id => !state.historicalToolIds.includes(id))
      state.historicalToolIds.push(...newIds)
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
    closeChat: state => {
      state.isChatOpen = false
      state.pendingMessage = null
    },
    clear: state => {
      state.historicalToolIds = []
      state.runtimeToolStates = {}
      state.persistedTransactions = []
      state.isChatOpen = false
      state.pendingMessage = null
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
  },
})
