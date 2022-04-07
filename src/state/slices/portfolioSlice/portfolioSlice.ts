import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP2, caip2 } from '@shapeshiftoss/caip'
import { mergeWith } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'

import { AccountSpecifierMap } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { initialState, Portfolio } from './portfolioSliceCommon'
import { accountToPortfolio } from './utils'

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
