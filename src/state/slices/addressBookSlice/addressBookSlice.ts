import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'

import type { AddressBookEntry } from '@/state/slices/addressBookSlice/types'
import { isDuplicateEntry } from '@/state/slices/addressBookSlice/utils'

export type AddressBookState = {
  byAccountId: Record<AccountId, AddressBookEntry>
}

export const initialState: AddressBookState = {
  byAccountId: {},
}

export const addressBookSlice = createSlice({
  name: 'addressBook',
  initialState,
  reducers: create => ({
    addAddress: create.reducer((state, action: PayloadAction<AddressBookEntry>) => {
      if (isDuplicateEntry(state.byAccountId, action.payload)) {
        return
      }

      const entry = action.payload
      // Store single entry regardless of chain namespace
      // Selectors will handle cross-chain EVM matching
      state.byAccountId[entry.accountId] = entry
    }),
    deleteAddress: create.reducer((state, action: PayloadAction<AddressBookEntry>) => {
      const entryToDelete = state.byAccountId[action.payload.accountId]

      if (!entryToDelete) return

      const { chainId } = fromAccountId(entryToDelete.accountId)
      const { chainNamespace } = fromChainId(chainId)

      // For EVM entries, we need to find and delete the actual stored entry
      // (which might be stored under a different EVM chain's accountId)
      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        const normalizedAddress = entryToDelete.address.toLowerCase()

        // Find and delete the EVM entry with this address
        const entryToDeleteKey = Object.keys(state.byAccountId).find(accountId => {
          const entry = state.byAccountId[accountId]
          const { chainId: entryChainId } = fromAccountId(accountId)
          const entryChainNamespace = fromChainId(entryChainId).chainNamespace

          return (
            entryChainNamespace === CHAIN_NAMESPACE.Evm &&
            entry.address.toLowerCase() === normalizedAddress
          )
        })

        if (entryToDeleteKey) {
          delete state.byAccountId[entryToDeleteKey]
        }

        return
      }

      // For non-EVM, just delete the single entry
      delete state.byAccountId[entryToDelete.accountId]
    }),
    clear: create.reducer(() => initialState),
  }),
  selectors: {
    selectEntriesByAccountId: state => state.byAccountId,
  },
})
