import { CAIP2 } from '@shapeshiftoss/caip'
import { ReduxState } from 'state/reducer'

import { createDeepEqualOutputSelector } from './../../selector-utils'

export const selectAccountSpecifiers = createDeepEqualOutputSelector(
  (state: ReduxState) => state.accountSpecifiers.accountSpecifiers,
  accountSpecifiers => accountSpecifiers,
)

// returns an array of the full `caip2:pubkeyish` type, as used in URLs for account pages
export const selectAccountSpecifierStrings = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers.map(accountSpecifier =>
    Object.entries(accountSpecifier)[0].join(':'),
  )

// Returns a CAIP2-indexed object with all the `caip2:pubkeyish` accounts for that chainId
// For most accounts, that's effectively a CAIP19, but not for e.g UTXO chains thus the pubkeyish naming
// We use this in cosmos plugin to get the pubkey as a CAIP19, without needing to use chain-adapters in components
// Since the pubkey is already in state
export const selectAccountSpecifier = (state: ReduxState, chainId: CAIP2) =>
  state.accountSpecifiers.accountSpecifiers.reduce<string[]>((acc, accountSpecifier) => {
    const pubkeyish = Object.entries(accountSpecifier)[0].join(':')
    const currentChainId = Object.keys(accountSpecifier)[0]

    if (currentChainId !== chainId) return acc

    acc.push(pubkeyish)

    return acc
  }, [])
