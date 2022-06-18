import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { ChainId } from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { ReduxState } from 'state/reducer'

import { AccountSpecifierMap } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { initialState, Portfolio } from './portfolioSliceCommon'
import { accountToPortfolio } from './utils'

const moduleLogger = logger.child({ namespace: ['portfolioSlice'] })

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    clear: () => {
      moduleLogger.info('clearing portfolio')
      return initialState
    },
    upsertPortfolio: (state, { payload }: { payload: Portfolio }) => {
      moduleLogger.info('upserting portfolio')
      // upsert all
      state.accounts.byId = { ...state.accounts.byId, ...payload.accounts.byId }
      const accountIds = Array.from(new Set([...state.accounts.ids, ...payload.accounts.ids]))
      state.accounts.ids = accountIds

      /**
       * when fetching an account we got to calculate the difference between the
       * state accountBalance and the payload accountBalance for each of account assets
       * and then add [or subtract] the diff to the state.assetBalances related item.
       */
      payload.accountBalances.ids.forEach(accountSpecifier => {
        // iterate over the account assets balances and calculate the diff
        Object.entries(payload.accountBalances.byId[accountSpecifier]).forEach(
          ([assetId, newAccountAssetBalance]) => {
            // in case if getting accounts for the first time
            const currentAccountBalance = bnOrZero(
              state.accountBalances.byId[accountSpecifier]?.[assetId],
            )
            // diff could be both positive [tx type -> receive] and negative [tx type -> send]
            const differenceBetweenCurrentAndNew =
              bnOrZero(newAccountAssetBalance).minus(currentAccountBalance)
            // get current asset balance from the state
            const currentAssetBalance = bnOrZero(state.assetBalances.byId?.[assetId])
            // update state.assetBalances with calculated diff
            state.assetBalances.byId[assetId] = currentAssetBalance
              .plus(differenceBetweenCurrentAndNew)
              .toString()
          },
        )
      })

      state.accountBalances.byId = {
        ...state.accountBalances.byId,
        ...payload.accountBalances.byId,
      }
      state.accountSpecifiers.byId = {
        ...state.accountSpecifiers.byId,
        ...payload.accountSpecifiers.byId,
      }
      const assetBalanceIds = Array.from(
        new Set([...state.assetBalances.ids, ...payload.assetBalances.ids]),
      )
      const accountBalanceIds = Array.from(
        new Set([...state.accountBalances.ids, ...payload.accountBalances.ids]),
      )
      const accountSpecifiers = Array.from(
        new Set([...state.accountSpecifiers.ids, ...payload.accountSpecifiers.ids]),
      )
      state.assetBalances.ids = assetBalanceIds
      state.accountBalances.ids = accountBalanceIds
      state.accountSpecifiers.ids = accountSpecifiers
    },
  },
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
        const [chainId, accountSpecifier] = Object.entries(accountSpecifierMap)[0] as [
          ChainId,
          string,
        ]
        try {
          const adapter = chainAdapters.get(chainId)
          if (!adapter) throw new Error(`no adapter for ${chainId} not available`)

          const chainAdaptersAccount = await adapter.getAccount(accountSpecifier)

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
      },
    }),
  }),
})
