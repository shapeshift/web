import { createSelector } from '@reduxjs/toolkit'
import type { ChainId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import { addressBookSlice } from './addressBookSlice'

import type { ReduxState } from '@/state/reducer'

export const selectAddressBookEntries = createSelector(
  addressBookSlice.selectors.selectAddressBookEntries,
  entries => entries,
)

export const selectAddressBookEntriesByChainId = createCachedSelector(
  addressBookSlice.selectors.selectAddressBookEntries,
  (_state: ReduxState, chainId: ChainId) => chainId,
  (entries, chainId) => entries.filter(entry => entry.chainId === chainId),
)((_state: ReduxState, chainId: ChainId): ChainId => chainId ?? 'undefined')
