import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'

import type { GridPlusState, SafeCard } from './types'

const initialState: GridPlusState = {
  connection: {
    physicalDeviceId: null,
    sessionId: null,
  },
  safecards: {
    byId: {},
    ids: [],
    activeId: null,
  },
}

export const gridplusSlice = createSlice({
  name: 'gridplus',
  initialState,
  reducers: create => ({
    setConnection: create.reducer(
      (
        state,
        action: PayloadAction<{
          physicalDeviceId: string
          sessionId: string
        }>,
      ) => {
        state.connection.physicalDeviceId = action.payload.physicalDeviceId
        state.connection.sessionId = action.payload.sessionId
      },
    ),

    addSafeCard: create.reducer(
      (
        state,
        action: PayloadAction<{
          id?: string
          name: string
          walletUid?: string
          type?: 'external' | 'internal'
        }>,
      ) => {
        const id = action.payload.id || uuidv4()
        const safeCard: SafeCard = {
          id,
          name: action.payload.name,
          createdAt: Date.now(),
          walletUid: action.payload.walletUid,
          type: action.payload.type,
        }
        state.safecards.byId[id] = safeCard
        state.safecards.ids.push(id)
        state.safecards.activeId = id
      },
    ),

    setActiveSafeCard: create.reducer((state, action: PayloadAction<string>) => {
      if (state.safecards.byId[action.payload]) {
        state.safecards.activeId = action.payload
      }
    }),

    setLastConnectedAt: create.reducer((state, action: PayloadAction<string>) => {
      if (state.safecards.byId[action.payload]) {
        state.safecards.byId[action.payload].lastConnectedAt = Date.now()
      }
    }),

    removeSafeCard: create.reducer((state, action: PayloadAction<string>) => {
      const id = action.payload
      delete state.safecards.byId[id]
      state.safecards.ids = state.safecards.ids.filter(i => i !== id)
      if (state.safecards.activeId === id) {
        state.safecards.activeId = state.safecards.ids[0] || null
      }
    }),

    setSafeCardName: create.reducer(
      (
        state,
        action: PayloadAction<{
          id: string
          name: string
        }>,
      ) => {
        if (state.safecards.byId[action.payload.id]) {
          state.safecards.byId[action.payload.id].name = action.payload.name
        }
      },
    ),

    updateSafeCardWalletUid: create.reducer(
      (
        state,
        action: PayloadAction<{
          id: string
          walletUid: string
          type: 'external' | 'internal'
        }>,
      ) => {
        if (state.safecards.byId[action.payload.id]) {
          state.safecards.byId[action.payload.id].walletUid = action.payload.walletUid
          state.safecards.byId[action.payload.id].type = action.payload.type
        }
      },
    ),

    clear: create.reducer(() => initialState),
  }),

  selectors: {
    selectConnection: state => state.connection,
    selectPhysicalDeviceId: state => state.connection.physicalDeviceId,
    selectSessionId: state => state.connection.sessionId,
    selectSafeCards: state => state.safecards.ids.map(id => state.safecards.byId[id]),
    selectActiveSafeCardId: state => state.safecards.activeId,
    selectActiveSafeCard: state =>
      state.safecards.activeId ? state.safecards.byId[state.safecards.activeId] : null,
    selectSafeCardById: (state, id: string) => state.safecards.byId[id],
    selectHasSafeCards: state => state.safecards.ids.length > 0,
  },
})
