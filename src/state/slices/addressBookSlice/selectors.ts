import { createSelector } from '@reduxjs/toolkit'
import type { ChainId, ChainNamespace } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
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

type SearchQueryFilter = {
  chainId: ChainId
  searchQuery: string
}

const selectSearchQueryFromFilter = (_state: ReduxState, filter: SearchQueryFilter) =>
  filter.searchQuery

export const selectAddressBookEntriesBySearchQuery = createCachedSelector(
  (state: ReduxState, filter: SearchQueryFilter) =>
    selectAddressBookEntriesByChainNamespace(state, filter.chainId),
  selectSearchQueryFromFilter,
  (entries, searchQuery) => {
    if (!searchQuery) return entries

    const matchedEntries = matchSorter(entries, searchQuery, {
      keys: [
        { key: 'name', threshold: matchSorter.rankings.MATCHES },
        { key: 'address', threshold: matchSorter.rankings.CONTAINS },
      ],
    })

    return matchedEntries
  },
)(
  (_state: ReduxState, filter: SearchQueryFilter) =>
    `${filter.chainId}_${filter.searchQuery ?? 'addressBookEntriesBySearchQuery'}`,
)
