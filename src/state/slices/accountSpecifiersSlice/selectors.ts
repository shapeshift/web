import { createSelector } from '@reduxjs/toolkit'
import { ReduxState } from 'state/reducer'
import { AccountSpecifier } from './accountSpecifiersSlice'

export const selectAccountSpecifiers = (state: ReduxState) => state.accountSpecifiers.accountSpecifiers

export const selectAccountSpecifiersByChainId = createSelector(
  selectAccountSpecifiers,
  (_state: ReduxState, chainId: string) => chainId,
    (accountSpecifiers, chainId) =>
       accountSpecifiers.reduce<AccountSpecifier[]>((acc, cur) => {
        const [_chainId, accountSpecifier] = Object.entries(cur)[0]
        if (_chainId !== chainId) return acc
        return acc.concat({ [chainId]: accountSpecifier })
      }, [])
)
