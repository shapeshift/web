import type { ChainId } from '@shapeshiftoss/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'

import { createDeepEqualOutputSelector } from './../../selector-utils'

export const selectAccountSpecifiers = createDeepEqualOutputSelector(
  (state: ReduxState) => state.accountSpecifiers.accountSpecifiers,
  accountSpecifiers => accountSpecifiers,
)

// returns an array of the full `chainId:pubkeyish` type, as used in URLs for account pages
export const selectAccountSpecifierStrings = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers.map(accountSpecifier =>
    Object.entries(accountSpecifier)[0].join(':'),
  )

// Returns a ChainId-indexed object with all the `chainId:pubkeyish` accounts for that chainId
// For most accounts, that's effectively an AssetId, but not for e.g UTXO chains thus the pubkeyish naming
// We use this in cosmos plugin to get the pubkey as an AssetId, without needing to use chain-adapters in components
// Since the pubkey is already in state
export const selectAccountSpecifiersByChainId = (state: ReduxState, chainId: ChainId) =>
  state.accountSpecifiers.accountSpecifiers.reduce<string[]>((acc, accountSpecifier) => {
    const pubkeyish = Object.entries(accountSpecifier)[0].join(':')
    const currentChainId = Object.keys(accountSpecifier)[0]

    if (currentChainId !== chainId) return acc

    acc.push(pubkeyish)

    return acc
  }, [])

export const selectFirstAccountSpecifierByChainId = createSelector(
  selectAccountSpecifiersByChainId,
  accountSpecifiers => accountSpecifiers[0],
)
