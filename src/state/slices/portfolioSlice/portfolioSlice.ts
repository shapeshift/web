import { createSelector, createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { caip2, caip10, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { Pubkeys } from 'hooks/usePubkeys/usePubkeys'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
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

type AccountsToPortfolioArgs = {
  [k: CAIP10]: chainAdapters.Account<ChainTypes>
}

type AccountsToPortfolio = (args: AccountsToPortfolioArgs) => Portfolio

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountsToPortfolio: AccountsToPortfolio = args => {
  const portfolio: Portfolio = cloneDeep(initialState)

  Object.entries(args).forEach(([CAIP10, account]) => {
    const { chain, network } = account
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
        const btcAccount = account as chainAdapters.Account<ChainTypes.Bitcoin>
        const btcCAIP19 = caip19.toCAIP19({ chain, network })
        const addresses = btcAccount.chainSpecific.addresses ?? []
        // TODO(0xdef1cafe): is there only one with a balance here...?
        const totalSats = addresses.reduce((acc, cur) => acc.plus(bnOrZero(cur.balance)), bn(0))
        const balance = totalSats.decimalPlaces(0).toString()

        // this will index accounts by xpub/ypub/zpub
        // with a combined balance of all sats in all addresses owned by that xpub
        portfolio.accounts.byId[CAIP10].push(btcCAIP19)
        portfolio.balances.byId[btcCAIP19] = balance
        portfolio.balances.ids.push(btcCAIP19)

        break
      }
      default:
        break
    }
  })

  return portfolio
}

export const portfolioApi = createApi({
  reducerPath: 'portfolioApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getAccounts: build.query<AccountsToPortfolioArgs, Pubkeys>({
      queryFn: async pubkeys => {
        // can't call hooks conditionally, this is a valid return
        if (isEmpty(pubkeys)) return { data: {} }

        const chainAdapters = getChainAdapters()

        // fetch accounts for each chain
        const promises = Object.entries(pubkeys).map(async ([CAIP2, pubkey]) => {
          // TODO(0xdef1cafe): chainAdapters.byCAIP2()
          const { chain } = caip2.fromCAIP2(CAIP2)
          return chainAdapters.byChain(chain).getAccount(pubkey)
        })

        // allow failures of individual chains
        const maybeAccounts = await Promise.allSettled(promises)

        const data = maybeAccounts.reduce<AccountsToPortfolioArgs>((acc, cur) => {
          if (cur.status === 'rejected') {
            // TODO(0xdef1cafe): handle error - this can't return both
            console.error(`portfolioApi: ${cur.reason}`)
          } else if (cur.status === 'fulfilled') {
            const CAIP2 = caip2.toCAIP2({ chain: cur.value.chain, network: cur.value.network })
            const CAIP10 = caip10.toCAIP10({ caip2: CAIP2, account: cur.value.pubkey })
            acc[CAIP10] = cur.value
          }
          return acc
        }, {})
        return { data }
      },
      onCacheEntryAdded: async (_args, { dispatch, cacheDataLoaded, getCacheEntry }) => {
        // we don't really have a 1:1 mapping between the chain adapters
        // response, and how we want to structure the data in the store
        // let RTK query managing the api bits, and we'll structure the data
        // how we want it in the portfolio

        await cacheDataLoaded

        const account = getCacheEntry().data
        if (!account) return

        dispatch(portfolio.actions.setPortfolio(accountsToPortfolio(account)))
      }
    })
  })
})

export const { useGetAccountsQuery } = portfolioApi

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
