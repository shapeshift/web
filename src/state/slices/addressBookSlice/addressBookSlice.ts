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
        const id = `${action.payload.chainId}_${action.payload.address}_${Date.now()}`
        const entry: AddressBookEntry = {
          ...action.payload,
          id,
          createdAt: Date.now(),
        }
        state.byId[id] = entry
        state.ids.push(id)
      },
    ),
    updateAddress: create.reducer((state, action: PayloadAction<{ id: string; name: string }>) => {
      const entry = state.byId[action.payload.id]
      if (entry) {
        entry.name = action.payload.name
      }
    }),
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
      state.ids.map(id => state.byId[id]).filter(entry => entry.chainId === chainId),
  },
})
