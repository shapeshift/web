import { createSelector, createSlice } from '@reduxjs/toolkit'
import { CAIP19 } from '@shapeshiftoss/caip'
import isEqual from 'lodash/isEqual'
import { ReduxState } from 'state/reducer'

// TODO(0xdef1cafe): implement this in @shapeshiftoss/caip first
// caip10 is account spec
// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
export type CAIP10 = string

export type PortfolioAccounts = {
  byId: {
    // asset ids belonging to an account
    [k: CAIP10]: CAIP19[]
  }
  // a list of accounts in this portfolio
  ids: CAIP10[]
}

export type PortfolioBalances = {
  byId: {
    // balance in base units of asset - bn doesn't serialize
    [k: CAIP19]: string
  }
  // all asset ids in an account
  ids: CAIP19[]
}

export type Portfolio = {
  accounts: PortfolioAccounts
  balances: PortfolioBalances
}

const initialState: Portfolio = {
  accounts: {
    byId: {},
    ids: []
  },
  balances: {
    byId: {},
    ids: []
  }
}

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {}
})

export const selectPortfolioAssetIds = createSelector(
  (state: ReduxState) => state.portfolio.balances.ids,
  ids => ids,
  { memoizeOptions: { resultEqualityCheck: isEqual } }
)

export const selectPortfolioBalances = createSelector(
  (state: ReduxState) => state.portfolio.balances.byId,
  byId => byId
)

export const selectPortfolioCryptoBalanceById = createSelector(
  (state: ReduxState) => state.portfolio.balances.byId,
  (_state: ReduxState, id: CAIP19) => id,
  (byId, id) => byId[id]
)
