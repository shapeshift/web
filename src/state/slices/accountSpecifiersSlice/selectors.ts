import type { AccountId, ChainId } from '@keepkey/caip'
import { fromAccountId } from '@keepkey/caip'
import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'

import { selectPortfolioAccountIds } from '../portfolioSlice/selectors'
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

export const selectFirstAccountIdByChainId = createSelector(
  selectPortfolioAccountIds,
  (_s: ReduxState, chainId: ChainId) => chainId,
  (accountIds, chainId): AccountId | undefined =>
    accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)[0],
)
