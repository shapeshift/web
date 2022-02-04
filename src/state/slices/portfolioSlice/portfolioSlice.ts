import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP2, caip2, CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { mergeWith } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import { getChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { AccountSpecifierMap } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'

import { accountToPortfolio } from './utils'

// TODO(0xdef1cafe): this needs a better home, probably in chain adapters
export const supportedAccountTypes = {
  [ChainTypes.Bitcoin]: [
    UtxoAccountType.SegwitNative,
    UtxoAccountType.SegwitP2sh,
    UtxoAccountType.P2pkh
  ],
  [ChainTypes.Ethereum]: undefined
}

/*
 * we can't retrieve an xpub from an address, but we can derive
 * addresses from xpubs
 * address have sats balances, but we want to display balances aggregated
 * by accountType, so we need a mapping from xpub to a list of addresses
 *
 * in the case of account based chains, e.g. eth, this will be a 1:1
 * mapping as the accountSpecifier (0x address) is the same as the address
 * holding assets with balances
 *
 * this satisfies our requirements of being able to aggregate balances
 * over an entire asset, e.g. show me all the eth i have across all my accounts
 * and also show me all the bitcoin i have across all different accountTypes
 * and addresses, and also preempts supporting more than accountIndex 0 in future
 */

// const ethAccountSpecifier: string = eip155:1:0xdef1...cafe
// const btcAccountSpecifier: string = 'bip122:000000000019d6689c085ae165831e93:xpub...'
export type AccountSpecifier = string

export type PortfolioAccounts = {
  byId: {
    // asset ids belonging to an account
    [k: AccountSpecifier]: CAIP19[]
  }
  // a list of accounts in this portfolio
  ids: AccountSpecifier[]
}

export type PortfolioBalancesById = {
  // these are aggregated balances across all accounts in a portfolio for the same asset
  // balance in base units of asset - bn doesn't serialize
  [k: CAIP19]: string
}

export type PortfolioAssetBalances = {
  byId: PortfolioBalancesById
  // all asset ids in an account
  ids: CAIP19[]
}

export type PortfolioAssets = {
  [k: CAIP19]: Asset
}

export type PortfolioAccountBalances = {
  byId: {
    [k: AccountSpecifier]: {
      // these are granular balances of this asset for this account
      [k: CAIP19]: string // balance for asset in base units
    }
  }
  ids: AccountSpecifier[]
}

export type PortfolioAccountSpecifiers = {
  byId: {
    // this maps an account identifier to a list of addresses
    // in the case of utxo chains, an account (e.g. xpub/ypub/zpub) can have multiple addresses
    // in account based chains, this is a 1:1 mapping, i.e. the account is the address
    [k: AccountSpecifier]: CAIP10[]
  }
  ids: AccountSpecifier[]
}

export type Portfolio = {
  accountSpecifiers: PortfolioAccountSpecifiers
  accounts: PortfolioAccounts
  assetBalances: PortfolioAssetBalances
  accountBalances: PortfolioAccountBalances
}

export const initialState: Portfolio = {
  accounts: {
    byId: {},
    ids: []
  },
  assetBalances: {
    byId: {},
    ids: []
  },
  accountSpecifiers: {
    byId: {},
    ids: []
  },
  accountBalances: {
    byId: {},
    ids: []
  }
}

// for assetBalances, they're aggregated across all accounts, so we need to
// upsert and sum the balances by id
// https://lodash.com/docs/4.17.15#mergeWith
const upsertAndSum = (dest: string, src: string) => {
  // if we have an existing balance for this asset, add to it
  if (dest) return bnOrZero(dest).plus(bnOrZero(src)).toString()
  // returning undefined uses default merge function, i.e. upsert
}

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertPortfolio: (state, { payload }: { payload: Portfolio }) => {
      // upsert all
      state.accounts.byId = { ...state.accounts.byId, ...payload.accounts.byId }
      const accountIds = Array.from(new Set([...state.accounts.ids, ...payload.accounts.ids]))
      state.accounts.ids = accountIds

      state.assetBalances.byId = mergeWith(
        state.assetBalances.byId,
        payload.assetBalances.byId,
        upsertAndSum
      )

      state.accountBalances.byId = {
        ...state.accountBalances.byId,
        ...payload.accountBalances.byId
      }
      state.accountSpecifiers.byId = {
        ...state.accountSpecifiers.byId,
        ...payload.accountSpecifiers.byId
      }
      const assetBalanceIds = Array.from(
        new Set([...state.assetBalances.ids, ...payload.assetBalances.ids])
      )
      const accountBalanceIds = Array.from(
        new Set([...state.accountBalances.ids, ...payload.accountBalances.ids])
      )
      const accountSpecifiers = Array.from(
        new Set([...state.accountSpecifiers.ids, ...payload.accountSpecifiers.ids])
      )
      state.assetBalances.ids = assetBalanceIds
      state.accountBalances.ids = accountBalanceIds
      state.accountSpecifiers.ids = accountSpecifiers
    }
  }
})

type GetAccountArgs = { accountSpecifierMap: AccountSpecifierMap }

export const portfolioApi = createApi({
  reducerPath: 'portfolioApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getAccount: build.query<Portfolio, GetAccountArgs>({
      queryFn: async ({ accountSpecifierMap }, { dispatch, getState }) => {
        if (isEmpty(accountSpecifierMap)) return { data: cloneDeep(initialState) }
        // 0xdef1cafe: be careful with this, RTK query can't type this correctly
        const untypedState = getState()
        const assetIds = (untypedState as ReduxState).assets.ids
        const chainAdapters = getChainAdapters()
        const [CAIP2, accountSpecifier] = Object.entries(accountSpecifierMap)[0] as [CAIP2, string]
        // TODO(0xdef1cafe): chainAdapters.byCAIP2()
        const { chain } = caip2.fromCAIP2(CAIP2)
        try {
          const chainAdaptersAccount = await chainAdapters
            .byChain(chain)
            .getAccount(accountSpecifier)
          const portfolioAccounts = { [accountSpecifier]: chainAdaptersAccount }
          const data = accountToPortfolio({ portfolioAccounts, assetIds })
          // dispatching wallet portfolio, this is done here instead of it being done in onCacheEntryAdded
          // to prevent edge cases like #820
          dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        } catch (e) {
          const status = 400
          const data = JSON.stringify(e)
          const error = { status, data }
          return { error }
        }
      }
    })
  })
})
