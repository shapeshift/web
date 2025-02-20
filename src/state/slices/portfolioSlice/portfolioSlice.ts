import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { accountManagement } from 'react-queries/queries/accountManagement'
import { PURGE } from 'redux-persist'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { selectNftCollections } from 'state/apis/nft/selectors'
import type { ReduxState } from 'state/reducer'

import { assets as assetSlice } from '../assetsSlice/assetsSlice'
import type { Portfolio, WalletId } from './portfolioSliceCommon'
import { initialState } from './portfolioSliceCommon'
import { accountToPortfolio, haveSameElements, makeAssets } from './utils'

type WalletMetaPayload = {
  walletId: WalletId
  walletName: string
  walletSupportedChainIds: ChainId[]
}

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    clear: () => {
      return initialState
    },
    setIsAccountMetadataLoading: (
      state,
      { payload }: { payload: { accountId: AccountId; isLoading: boolean } },
    ) => {
      state.isAccountMetadataLoadingByAccountId[payload.accountId] = payload.isLoading
    },
    setWalletMeta: (
      state,
      { payload }: { payload: Omit<WalletMetaPayload, 'walletSupportedChainIds'> | undefined },
    ) => {
      // don't fire and rerender with same action
      if (state.connectedWallet?.id === payload?.walletId) return

      // note this function can unset the walletId to undefined
      if (payload !== undefined) {
        const { walletId, walletName } = payload

        const data = { 'Wallet Id': walletId, 'Wallet Name': walletName }
        // if we already have state.walletId, we're switching wallets, otherwise connecting
        getMixPanel()?.track(
          state.connectedWallet?.id ? MixPanelEvent.SwitchWallet : MixPanelEvent.ConnectWallet,
          data,
        )
        state.connectedWallet = {
          id: walletId,
          name: walletName,
          supportedChainIds: [],
        }
        state.wallet.ids = Array.from(new Set([...state.wallet.ids, walletId])).filter(Boolean)
      } else {
        state.connectedWallet = undefined
        getMixPanel()?.track(MixPanelEvent.DisconnectWallet)
      }
    },
    setWalletSupportedChainIds: (state, { payload }: { payload: ChainId[] }) => {
      // should never happen as connectedWallet is set in the wallet provider before other actions can be fired
      if (state.connectedWallet === undefined) return

      // don't modify state if it's the same by value
      if (haveSameElements(payload, state.connectedWallet.supportedChainIds)) return

      Object.assign(state.connectedWallet, { supportedChainIds: payload })
    },
    upsertAccountMetadata: (
      draftState,
      {
        payload,
      }: { payload: { accountMetadataByAccountId: AccountMetadataById; walletId: string } },
    ) => {
      // WARNING: don't use the current state.connectedWallet.id here because it's updated async
      // to this and results in account data corruption
      const { accountMetadataByAccountId, walletId } = payload
      draftState.accountMetadata.byId = merge(
        draftState.accountMetadata.byId,
        accountMetadataByAccountId,
      )
      draftState.accountMetadata.ids = Object.keys(draftState.accountMetadata.byId)

      if (!draftState.connectedWallet) return // realistically, at this point, we should have a wallet set
      const existingWalletAccountIds = draftState.wallet.byId[walletId] ?? []
      const newWalletAccountIds = Object.keys(accountMetadataByAccountId)
      // keep an index of what account ids belong to this wallet
      draftState.wallet.byId[walletId] = uniq(existingWalletAccountIds.concat(newWalletAccountIds))
    },
    clearWalletMetadata: (draftState, { payload }: { payload: WalletId }) => {
      const walletId = payload
      // Clear AccountIds that were previously associated with that wallet
      draftState.wallet.byId[walletId] = []
      draftState.wallet.ids = draftState.wallet.ids.filter(id => id !== walletId)

      // TODO(gomes): do we also want to clear draftState.accountMetadata entries themselves?
      // Theoretically, not doing so would make reloading these easier?
    },
    clearWalletPortfolioState: (draftState, { payload }: { payload: string }) => {
      const walletId = payload

      delete draftState.wallet.byId[walletId]
      draftState.wallet.ids = draftState.wallet.ids.filter(id => id !== walletId)
      delete draftState.accountMetadata.byId[walletId]
      draftState.accountMetadata.ids = draftState.accountMetadata.ids.filter(id => id !== walletId)
      delete draftState.accountBalances.byId[walletId]
      draftState.accountBalances.ids = draftState.accountBalances.ids.filter(id => id !== walletId)
      delete draftState.enabledAccountIds[walletId]
    },
    upsertPortfolio: (draftState, { payload }: { payload: Portfolio }) => {
      // upsert all
      draftState.accounts.byId = merge(draftState.accounts.byId, payload.accounts.byId)
      draftState.accounts.ids = Object.keys(draftState.accounts.byId)
      draftState.accountBalances.byId = merge(
        draftState.accountBalances.byId,
        payload.accountBalances.byId,
      )
      draftState.accountBalances.ids = Object.keys(draftState.accountBalances.byId)
    },
    /**
     * Explicitly enable an account by its `AccountId`. Necessary where `use-strict` toggles twice
     * during initial load, leading to all auto-detected accounts being disabled.
     */
    enableAccountId: (draftState, { payload: accountId }: { payload: AccountId }) => {
      const walletId = draftState.connectedWallet?.id

      if (!walletId) return

      const enabledAccountIdsSet = new Set(draftState.enabledAccountIds[walletId])
      enabledAccountIdsSet.add(accountId)
      draftState.enabledAccountIds[walletId] = Array.from(enabledAccountIdsSet)
    },
    toggleAccountIdEnabled: (draftState, { payload: accountId }: { payload: AccountId }) => {
      const walletId = draftState.connectedWallet?.id

      if (!walletId) return

      const enabledAccountIdsSet = new Set(draftState.enabledAccountIds[walletId])
      const isEnabled = enabledAccountIdsSet.has(accountId)

      if (isEnabled) {
        enabledAccountIdsSet.delete(accountId)
      } else {
        enabledAccountIdsSet.add(accountId)
      }

      draftState.enabledAccountIds[walletId] = Array.from(enabledAccountIdsSet)
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
        dispatch(portfolio.actions.setIsAccountMetadataLoading({ accountId, isLoading: true }))
        if (!accountId) return { data: cloneDeep(initialState) }
        const state: ReduxState = getState() as any
        const assetIds = state.assets.ids
        const chainAdapters = getChainAdapterManager()
        const { chainId, account: pubkey } = fromAccountId(accountId)
        try {
          const adapter = chainAdapters.get(chainId)
          if (!adapter) throw new Error(`no adapter for ${chainId} not available`)
          // We want the query to be Infinity staleTime and gcTime for later use, but we also want it to always refetch
          // This is consumed by TransactionProvider and failure to do so means portfolio will *not* be updated
          await queryClient.invalidateQueries({
            queryKey: accountManagement.getAccount(accountId).queryKey,
            refetchType: 'all',
            exact: true,
          })
          const portfolioAccounts = {
            [pubkey]: await queryClient.fetchQuery({
              ...accountManagement.getAccount(accountId),
              staleTime: Infinity,
              // Never garbage collect me, I'm a special snowflake
              gcTime: Infinity,
            }),
          }

          const nftCollectionsById = selectNftCollections(state)

          // Prefetch smart contract checks - do *not* await/.then() me, this is only for the purpose of having this cached later
          fetchIsSmartContractAddressQuery(pubkey, chainId)

          const data = await (async (): Promise<Portfolio> => {
            const assets = await makeAssets({ chainId, pubkey, state, portfolioAccounts })

            // upsert placeholder assets
            if (assets) dispatch(assetSlice.actions.upsertAssets(assets))

            return accountToPortfolio({
              portfolioAccounts,
              assetIds: assetIds.concat(assets?.ids ?? []),
              nftCollectionsById,
            })
          })()

          upsertOnFetch && dispatch(portfolio.actions.upsertPortfolio(data))
          dispatch(portfolio.actions.setIsAccountMetadataLoading({ accountId, isLoading: false }))
          return { data }
        } catch (e) {
          console.error(e)
          const data = cloneDeep(initialState)
          data.accounts.ids.push(accountId)
          data.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
          dispatch(portfolio.actions.upsertPortfolio(data))
          dispatch(portfolio.actions.setIsAccountMetadataLoading({ accountId, isLoading: false }))
          return { data }
        }
      },
    }),
  }),
})
