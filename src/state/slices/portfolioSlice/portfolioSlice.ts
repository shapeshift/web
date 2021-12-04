import { createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { CAIP2, caip2, caip10, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import isEqual from 'lodash/isEqual'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
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
  reducers: {
    clearPortfolio: () => initialState,
    setPortfolio: (_state, { payload }: { payload: Portfolio }) => payload
  }
})

type AccountToPortfolio = (account: chainAdapters.Account<ChainTypes>) => Portfolio

export const accountToPortfolio: AccountToPortfolio = account => {
  const portfolio: Portfolio = {
    accounts: {
      byId: {},
      ids: []
    },
    balances: {
      byId: {},
      ids: []
    }
  }

  const { chain, network, pubkey } = account
  const accountCAIP2 = caip2.toCAIP2({ chain, network })
  const CAIP10 = caip10.toCAIP10({ caip2: accountCAIP2, account: pubkey })
  portfolio.accounts.byId[CAIP10] = []
  portfolio.accounts.ids.push(CAIP10)
  switch (chain) {
    case ChainTypes.Ethereum: {
      const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
      const ethCAIP19 = caip19.toCAIP19({ chain, network })
      portfolio.accounts.byId[CAIP10].push(ethCAIP19)
      portfolio.balances.ids.push(ethCAIP19)
      portfolio.balances.byId[ethCAIP19] = ethAccount.balance
      const { tokens } = ethAccount.chainSpecific
      if (!tokens) break
      tokens.forEach(token => {
        const { contractType, contract: tokenId, balance } = token
        const tokenCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
        portfolio.accounts.byId[CAIP10].push(tokenCAIP19)
        portfolio.balances.ids.push(tokenCAIP19)
        portfolio.balances.byId[tokenCAIP19] = balance
      })
      break
    }
    case ChainTypes.Bitcoin: {
      throw new Error('unimplemented')
    }
    default:
      break
  }
  return portfolio
}

export const portfolioApi = createApi({
  reducerPath: 'portfolioApi',
  // not actually used, only used to satisfy createApi, we use a queryFn for each
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: build => ({
    getAccount: build.query<chainAdapters.Account<ChainTypes>, { CAIP2: CAIP2; pubkey: string }>({
      queryFn: async args => {
        const { CAIP2, pubkey } = args
        const chainAdapters = getChainAdapters()
        const { chain } = caip2.fromCAIP2(CAIP2)
        // TODO(0xdef1cafe): chainAdapters.byCAIP2()
        const chainAdapter = chainAdapters.byChain(chain)
        try {
          const data = await chainAdapter.getAccount(pubkey)
          return { data }
        } catch (e) {
          return { error: e as FetchBaseQueryError }
        }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        // we don't really have a 1:1 mapping between the chain adapters
        // response, and how we want to structure the data in the store
        // let RTK query managing the api bits, and we'll structure the data
        // how we want it in the portfolio

        await cacheDataLoaded

        const account = getCacheEntry().data
        if (!account) return

        dispatch(portfolio.actions.setPortfolio(accountToPortfolio(account)))
      }
    })
  })
})

export const { useGetAccountQuery } = portfolioApi

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
