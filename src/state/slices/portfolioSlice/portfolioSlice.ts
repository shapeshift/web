import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { PURGE } from 'redux-persist'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { ReduxState } from 'state/reducer'

import type { AccountMetadataById, Portfolio, WalletId } from './portfolioSliceCommon'
import { initialState } from './portfolioSliceCommon'
import { accountToPortfolio } from './utils'

type WalletMetaPayload = {
  walletId?: WalletId | undefined
  walletName?: string | undefined
}

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    clear: () => {
      return initialState
    },
    setWalletMeta: (state, { payload }: { payload: WalletMetaPayload }) => {
      const { walletId, walletName } = payload
      // don't fire and rerender with same action
      if (state.walletId === walletId) return
      // note this function can unset the walletId to undefined
      if (walletId) {
        const data = { 'Wallet Id': walletId, 'Wallet Name': walletName }
        // if we already have state.walletId, we're switching wallets, otherwise connecting
        getMixPanel()?.track(
          state.walletId ? MixPanelEvents.SwitchWallet : MixPanelEvents.ConnectWallet,
          data,
        )
        state.walletId = walletId
        state.walletName = walletName
        state.wallet.ids = Array.from(new Set([...state.wallet.ids, walletId])).filter(Boolean)
      } else {
        state.walletId = undefined
        state.walletName = undefined
        getMixPanel()?.track(MixPanelEvents.DisconnectWallet)
      }
    },
    upsertAccountMetadata: {
      reducer: (draftState, { payload }: { payload: AccountMetadataById }) => {
        draftState.accountMetadata.byId = merge(draftState.accountMetadata.byId, payload)
        draftState.accountMetadata.ids = Object.keys(draftState.accountMetadata.byId)

        if (!draftState.walletId) return // realistically, at this point, we should have a walletId set
        const existingWalletAccountIds = draftState.wallet.byId[draftState.walletId] ?? []
        const newWalletAccountIds = Object.keys(payload)
        // keep an index of what account ids belong to this wallet
        draftState.wallet.byId[draftState.walletId] = uniq(
          existingWalletAccountIds.concat(newWalletAccountIds),
        )
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<AccountMetadataById>(),
    },
    upsertPortfolio: {
      reducer: (draftState, { payload }: { payload: Portfolio }) => {
        // upsert all
        draftState.accounts.byId = merge(draftState.accounts.byId, payload.accounts.byId)
        draftState.accounts.ids = Object.keys(draftState.accounts.byId)

        draftState.accountBalances.byId = merge(
          draftState.accountBalances.byId,
          payload.accountBalances.byId,
        )
        draftState.accountBalances.ids = Object.keys(draftState.accountBalances.byId)
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<Portfolio>(),
    },
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})

type GetAccountArgs = {
  accountId: AccountId
  upsertOnFetch?: boolean
}

export const portfolioApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portfolioApi',
  endpoints: build => ({
    getAccount: build.query<Portfolio, GetAccountArgs>({
      queryFn: async ({ accountId, upsertOnFetch }, { dispatch, getState }) => {
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
          upsertOnFetch && dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        } catch (e) {
          console.error(e)
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
