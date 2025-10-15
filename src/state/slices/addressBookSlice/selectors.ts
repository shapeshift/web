import { createSelector } from '@reduxjs/toolkit'
import type { ChainId, ChainNamespace } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import { addressBookSlice } from './addressBookSlice'

import type { ReduxState } from '@/state/reducer'

export const selectAddressBookEntries = createSelector(
  addressBookSlice.selectors.selectAddressBookEntries,
  entries => entries,
)

export const selectAddressBookEntriesByChainNamespace = createCachedSelector(
  addressBookSlice.selectors.selectAddressBookEntries,
  (_state: ReduxState, chainId: ChainId) => chainId,
  (entries, chainId) => {
    const { chainNamespace } = fromChainId(chainId)

    // Filter entries that match the same chain namespace
    // This allows addresses to work across all chains of the same type
    // (e.g., an Ethereum address works on all EVM chains)
    return entries.filter(entry => {
      const entryNamespace = fromChainId(entry.chainId).chainNamespace
      return entryNamespace === chainNamespace
    })
  },
)((_state: ReduxState, chainId: ChainId): ChainNamespace => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace
})
