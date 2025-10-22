import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { ChainId } from '@shapeshiftoss/caip'

export type AddressBookEntry = {
  id: string
  name: string
  address: string
  chainId: ChainId
  createdAt: number
}

export type AddressBookState = {
  byId: Record<string, AddressBookEntry>
  ids: string[]
}

export const initialState: AddressBookState = {
  byId: {},
  ids: [],
}

export const addressBookSlice = createSlice({
  name: 'addressBook',
  initialState,
  reducers: create => ({
    addAddress: create.reducer(
      (state, action: PayloadAction<Omit<AddressBookEntry, 'id' | 'createdAt'>>) => {
        // Extra safety just in case logic is broken on UI side and the user adds the same address twice
        const isDuplicate = state.ids.some(existingId => {
          const existing = state.byId[existingId]
          return (
            existing.chainId === action.payload.chainId &&
            existing.address === action.payload.address
          )
        })
        if (isDuplicate) return

        const now = Date.now()
        const id = `${action.payload.chainId}_${action.payload.address}_${now}`
        const entry: AddressBookEntry = {
          ...action.payload,
          id,
          createdAt: now,
        }
        state.byId[id] = entry
        state.ids.push(id)
      },
    ),
    deleteAddress: create.reducer((state, action: PayloadAction<string>) => {
      delete state.byId[action.payload]
      state.ids = state.ids.filter(id => id !== action.payload)
    }),
    clear: create.reducer(() => initialState),
  }),
  selectors: {
    selectAddressBookEntries: state => state.ids.map(id => state.byId[id]),
    selectAddressBookEntryById: (state, entryId: string) => state.byId[entryId],
    selectAddressBookEntriesByChainId: (state, chainId: ChainId) =>
      state.ids.filter(id => state.byId[id].chainId === chainId).map(id => state.byId[id]),
  },
})
