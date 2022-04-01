import { CAIP2 } from '@shapeshiftoss/caip'
import { ReduxState } from 'state/reducer'

export const selectAccountSpecifiers = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers

// returns an array of the full `caip2:pubkeyish` type, as used in URLs for account pages
export const selectAccountSpecifierStrings = (state: ReduxState) =>
  state.accountSpecifiers.accountSpecifiers.map(accountSpecifier =>
    Object.entries(accountSpecifier)[0].join(':')
  )

// returns a CAIP2-indexed object with all the `caip2:pubkeyish` accounts for that chainId
export const selectPubkeyishByChainId = (state: ReduxState, chainId: CAIP2) =>
  state.accountSpecifiers.accountSpecifiers.reduce<string[]>((acc, accountSpecifier) => {
    const pubkeyish = Object.entries(accountSpecifier)[0].join(':')
    const currentChainId = Object.keys(accountSpecifier)[0]

    if (currentChainId !== chainId) return acc

    acc.push(pubkeyish)

    return acc
  }, [])
