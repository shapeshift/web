import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'

import type { AccountMetadataById, Portfolio } from './portfolioSliceCommon'
import { initialState } from './portfolioSliceCommon'
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
    upsertAccountMetadata: (state, { payload }: { payload: AccountMetadataById }) => {
      moduleLogger.debug('upserting account metadata')
      state.accountMetadata.byId = {
        ...state.accountMetadata.byId,
        ...payload,
      }
      state.accountMetadata.ids = Array.from(new Set([...Object.keys(payload)]))
    },
    upsertPortfolio: (state, { payload }: { payload: Portfolio }) => {
      moduleLogger.debug('upserting portfolio')
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
      const assetBalanceIds = Array.from(
        new Set([...state.assetBalances.ids, ...payload.assetBalances.ids]),
      )
      const accountBalanceIds = Array.from(
        new Set([...state.accountBalances.ids, ...payload.accountBalances.ids]),
      )
      state.assetBalances.ids = assetBalanceIds
      state.accountBalances.ids = accountBalanceIds
    },
  },
})

export const portfolioApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portfolioApi',
  endpoints: build => ({
    getAccount: build.query<Portfolio, AccountId>({
      queryFn: async (accountId, { dispatch, getState }) => {
        if (!accountId) return { data: cloneDeep(initialState) }
        // 0xdef1cafe: be careful with this, RTK query can't type this correctly
        const untypedState = getState()
        const assetIds = (untypedState as ReduxState).assets.ids
        const chainAdapters = getChainAdapterManager()
        const { chainId, account: pubkey } = fromAccountId(accountId)
        try {
          const adapter = chainAdapters.get(chainId)
          if (!adapter) throw new Error(`no adapter for ${chainId} not available`)
          const portfolioAccounts = { [pubkey]: await adapter.getAccount(pubkey) }
          const data = accountToPortfolio({ portfolioAccounts, assetIds })
          dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        } catch (e) {
          moduleLogger.error(e, `error fetching account ${accountId}`)
          const data = cloneDeep(initialState)
          data.accounts.ids.push(accountId)
          data.accounts.byId[accountId] = { assetIds: [] }
          dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        }
      },
    }),
  }),
})
