import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, fromAccountId, isNft, toAssetId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { AccountMetadataById, EvmChainId } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { makeAsset } from '@shapeshiftoss/utils'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { PURGE } from 'redux-persist'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { fetchPortalsAccount, fetchPortalsPlatforms, maybeTokenImage } from 'lib/portals/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { isSpammyNftText, isSpammyTokenText } from 'state/apis/nft/constants'
import { selectNftCollections } from 'state/apis/nft/selectors'
import type { ReduxState } from 'state/reducer'

import type { UpsertAssetsPayload } from '../assetsSlice/assetsSlice'
import { assets as assetSlice } from '../assetsSlice/assetsSlice'
import type { Portfolio, WalletId } from './portfolioSliceCommon'
import { initialState } from './portfolioSliceCommon'
import { accountToPortfolio, haveSameElements } from './utils'

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
    setIsAccountMetadataLoading: (state, { payload }: { payload: boolean }) => {
      state.isAccountMetadataLoading = payload
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
    upsertAccountMetadata: {
      reducer: (
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
        draftState.wallet.byId[walletId] = uniq(
          existingWalletAccountIds.concat(newWalletAccountIds),
        )
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<{
        accountMetadataByAccountId: AccountMetadataById
        walletId: string
      }>(),
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

          const data = await (async (): Promise<Portfolio> => {
            // add placeholder non spam assets for evm chains
            if (evmChainIds.includes(chainId as EvmChainId)) {
              const maybePortalsAccounts = await fetchPortalsAccount(chainId, pubkey)
              const maybePortalsPlatforms = await queryClient.fetchQuery({
                queryFn: () => fetchPortalsPlatforms(),
                queryKey: ['portalsPlatforms'],
              })
              const account = portfolioAccounts[pubkey] as Account<EvmChainId>

              const assets = (account.chainSpecific.tokens ?? []).reduce<UpsertAssetsPayload>(
                (prev, token) => {
                  const isSpam = [token.name, token.symbol].some(text => {
                    if (isNft(token.assetId)) return isSpammyNftText(text)
                    return isSpammyTokenText(text)
                  })
                  if (state.assets.byId[token.assetId] || isSpam) return prev
                  let minimalAsset: MinimalAsset = token
                  const maybePortalsAsset = maybePortalsAccounts[token.assetId]
                  if (maybePortalsAsset) {
                    const isPool = Boolean(
                      maybePortalsAsset.platform && maybePortalsAsset.tokens?.length,
                    )
                    const platform = maybePortalsPlatforms[maybePortalsAsset.platform]

                    const name = (() => {
                      // For single assets, just use the token name
                      if (!isPool) return maybePortalsAsset.name
                      // For pools, create a name in the format of "<platform> <assets> Pool"
                      // e.g "UniswapV2 ETH/FOX Pool"
                      const assetSymbols =
                        maybePortalsAsset.tokens?.map(underlyingToken => {
                          const assetId = toAssetId({
                            chainId,
                            assetNamespace:
                              chainId === bscChainId
                                ? ASSET_NAMESPACE.bep20
                                : ASSET_NAMESPACE.erc20,
                            assetReference: underlyingToken,
                          })
                          const underlyingAsset = state.assets.byId[assetId]
                          if (!underlyingAsset) return undefined

                          // This doesn't generalize, but this'll do, this is only a visual hack to display native asset instead of wrapped
                          // We could potentially use related assets for this and use primary implementation, though we'd have to remove BTC from there as WBTC and BTC are very
                          // much different assets on diff networks, i.e can't deposit BTC instead of WBTC automagically like you would with ETH instead of WETH
                          switch (underlyingAsset.symbol) {
                            case 'WETH':
                              return 'ETH'
                            case 'WBNB':
                              return 'BNB'
                            case 'WMATIC':
                              return 'MATIC'
                            case 'WAVAX':
                              return 'AVAX'
                            default:
                              return underlyingAsset.symbol
                          }
                        }) ?? []

                      // Our best effort to contruct sane name using the native asset -> asset naming hack failed, but thankfully, upstream name is very close e.g
                      // for "UniswapV2 LP TRUST/WETH", we just have to append "Pool" to that and we're gucci
                      if (assetSymbols.some(symbol => !symbol)) return `${token.name} Pool`
                      return `${platform.name} ${assetSymbols.join('/')} Pool`
                    })()

                    const images = maybePortalsAsset.images ?? []
                    const [, ...underlyingAssetsImages] = images
                    const iconOrIcons = (() => {
                      // There are no underlying tokens' images, return asset icon if it exists
                      if (!underlyingAssetsImages?.length)
                        return { icon: state.assets.byId[token.assetId]?.icon }

                      if (underlyingAssetsImages.length === 1) {
                        return {
                          icon: maybeTokenImage(
                            maybePortalsAsset.image || underlyingAssetsImages[0],
                          ),
                        }
                      }
                      // This is a multiple assets pool, populate icons array
                      if (underlyingAssetsImages.length > 1)
                        return {
                          icons: underlyingAssetsImages.map((underlyingAssetsImage, i) => {
                            // No token at that index, but this isn't reliable as we've found out, it may be missing in tokens but present in images
                            // However, this has to be an early return and we can't use our own flavour of that asset... because we have no idea which asset it is.
                            if (!maybePortalsAsset.tokens[i])
                              return maybeTokenImage(underlyingAssetsImage)

                            const underlyingAssetId = toAssetId({
                              chainId,
                              assetNamespace:
                                chainId === bscChainId
                                  ? ASSET_NAMESPACE.bep20
                                  : ASSET_NAMESPACE.erc20,
                              assetReference: maybePortalsAsset.tokens[i],
                            })
                            const underlyingAsset = state.assets.byId[underlyingAssetId]
                            // Prioritise our own flavour of icons for that asset if available, else use upstream if present
                            return underlyingAsset?.icon || maybeTokenImage(underlyingAssetsImage)
                          }),
                          icon: undefined,
                        }
                    })()

                    // @ts-ignore this is the best we can do, some icons *may* be missing
                    minimalAsset = {
                      ...minimalAsset,
                      name,
                      isPool,
                      ...iconOrIcons,
                    }
                  }
                  prev.byId[token.assetId] = makeAsset(state.assets.byId, minimalAsset)
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
