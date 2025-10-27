import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId, toAccountId } from '@shapeshiftoss/caip'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { AddressBookEntry } from '@/state/slices/addressBookSlice/types'
import { isDuplicateEntry } from '@/state/slices/addressBookSlice/utils'

export type AddressBookState = {
  byAccountId: Record<AccountId, AddressBookEntry>
}

export const initialState: AddressBookState = {
  byAccountId: {},
}

const getSupportedEvmChainIds = (): ChainId[] => {
  const chainAdapterManager = getChainAdapterManager()
  const chainIds = Array.from(chainAdapterManager.keys())

  return chainIds.filter((chainId: ChainId) => {
    const { chainNamespace } = fromChainId(chainId)
    return chainNamespace === CHAIN_NAMESPACE.Evm
  })
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
      const { chainNamespace } = fromChainId(entry.chainId)

      // For EVM entries (both external and own account), create entries for ALL supported EVM chains
      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        const supportedEvmChainIds = getSupportedEvmChainIds()

        // Create an entry for each supported EVM chain
        supportedEvmChainIds.forEach(chainId => {
          const evmEntry: AddressBookEntry = {
            ...entry,
            chainId,
          }

          const key = toAccountId({ chainId: evmEntry.chainId, account: evmEntry.address })

          state.byAccountId[key] = evmEntry
        })

        return
      }

      // For non-EVM entries, add single entry
      const key = toAccountId({ chainId: entry.chainId, account: entry.address })
      state.byAccountId[key] = entry
    }),
    deleteAddress: create.reducer((state, action: PayloadAction<AddressBookEntry>) => {
      const key = toAccountId({ chainId: action.payload.chainId, account: action.payload.address })
      const entryToDelete = state.byAccountId[key]

      if (!entryToDelete) return

      const { chainNamespace } = fromChainId(entryToDelete.chainId)

      // For EVM entries (both external and own account), delete ALL entries with this address across all EVM chains
      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        const normalizedAddress = entryToDelete.address.toLowerCase()

        // Find and delete all EVM entries with this address
        Object.values(state.byAccountId).forEach(entry => {
          const entryChainNamespace = fromChainId(entry.chainId).chainNamespace
          if (
            entryChainNamespace === CHAIN_NAMESPACE.Evm &&
            entry.address.toLowerCase() === normalizedAddress
          ) {
            const key = toAccountId({ chainId: entry.chainId, account: entry.address })
            delete state.byAccountId[key]
          }
        })

        return
      }

      delete state.byAccountId[key]
    }),
    clear: create.reducer(() => initialState),
  }),
  selectors: {
    selectEntriesByAccountId: state => state.byAccountId,
  },
})
