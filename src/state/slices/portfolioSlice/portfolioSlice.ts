import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, isNft } from '@shapeshiftoss/caip'
import { type Account, type EvmChainId, evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { PURGE } from 'redux-persist'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { isSpammyNftText, isSpammyTokenText } from 'state/apis/nft/constants'
import { selectNftCollections } from 'state/apis/nft/selectors'
import type { ReduxState } from 'state/reducer'

import type { AssetsState } from '../assetsSlice/assetsSlice'
import { assets as assetSlice, makeAsset } from '../assetsSlice/assetsSlice'
import type { Portfolio, WalletId } from './portfolioSliceCommon'
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
    clearWalletMetadata: {
      reducer: (draftState, { payload }: { payload: WalletId }) => {
        const walletId = payload
        // Clear AccountIds that were previously associated with that wallet
        draftState.wallet.byId[walletId] = []
        draftState.wallet.ids = draftState.wallet.ids.filter(id => id !== walletId)

        // TODO(gomes): do we also want to clear draftState.accountMetadata entries themselves?
        // Theoretically, not doing so would make reloading these easier?
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<WalletId>(),
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
        const state: ReduxState = getState() as any
        const assetIds = state.assets.ids
        const chainAdapters = getChainAdapterManager()
        const { chainId, account: pubkey } = fromAccountId(accountId)
        try {
          const adapter = chainAdapters.get(chainId)
          if (!adapter) throw new Error(`no adapter for ${chainId} not available`)
          const portfolioAccounts = { [pubkey]: await adapter.getAccount(pubkey) }
          const nftCollectionsById = selectNftCollections(state)

          const data = ((): Portfolio => {
            // add placeholder non spam assets for evm chains
            if (evmChainIds.includes(chainId as EvmChainId)) {
              const account = portfolioAccounts[pubkey] as Account<EvmChainId>

              const assets = (account.chainSpecific.tokens ?? []).reduce<AssetsState>(
                (prev, token) => {
                  const isSpam = [token.name, token.symbol].some(text => {
                    if (isNft(token.assetId)) return isSpammyNftText(text)
                    return isSpammyTokenText(text)
                  })
                  if (state.assets.byId[token.assetId] || isSpam) return prev
                  prev.byId[token.assetId] = makeAsset({ ...token })
                  prev.ids.push(token.assetId)
                  return prev
                },
                { byId: {}, ids: [] },
              )

              // upsert placeholder assets
              dispatch(assetSlice.actions.upsertAssets(assets))

              return accountToPortfolio({
                portfolioAccounts,
                assetIds: assetIds.concat(assets.ids),
                nftCollectionsById,
              })
            }

            return accountToPortfolio({ portfolioAccounts, assetIds, nftCollectionsById })
          })()

          upsertOnFetch && dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        } catch (e) {
          console.error(e)
          const data = cloneDeep(initialState)
          data.accounts.ids.push(accountId)
          data.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
          dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        }
      },
    }),
  }),
})
