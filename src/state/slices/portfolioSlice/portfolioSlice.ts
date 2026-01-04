import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { PURGE } from 'redux-persist'

import { assets as assetSlice } from '../assetsSlice/assetsSlice'
import type { Portfolio, WalletId } from './portfolioSliceCommon'
import { initialState } from './portfolioSliceCommon'
import { accountToPortfolio, haveSameElements, makeAssets } from './utils'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { HypeLabEvent, trackHypeLabEvent } from '@/lib/hypelab/hypelabSingleton'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { accountManagement } from '@/react-queries/queries/accountManagement'
import { BASE_RTK_CREATE_API_CONFIG } from '@/state/apis/const'
import type { ReduxState } from '@/state/reducer'

type WalletMetaPayload = {
  walletId: WalletId
  walletName: string
  walletSupportedChainIds: ChainId[]
}

export const portfolio = createSlice({
  name: 'portfolio',
  initialState,
  reducers: create => ({
    clear: create.reducer(() => {
      return initialState
    }),
    setIsPortfolioGetAccountLoading: create.reducer(
      (state, { payload }: { payload: { accountId: AccountId; isLoading: boolean } }) => {
        state.isPortfolioGetAccountLoadingByAccountId[payload.accountId] = payload.isLoading
      },
    ),
    setWalletMeta: create.reducer(
      (
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
          const isNewConnect = !state.connectedWallet?.id
          getMixPanel()?.track(
            isNewConnect ? MixPanelEvent.ConnectWallet : MixPanelEvent.SwitchWallet,
            data,
          )
          if (isNewConnect) {
            trackHypeLabEvent(HypeLabEvent.WalletConnected)
          }
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
    ),
    setWalletSupportedChainIds: create.reducer((state, { payload }: { payload: ChainId[] }) => {
      // should never happen as connectedWallet is set in the wallet provider before other actions can be fired
      if (state.connectedWallet === undefined) return

      // don't modify state if it's the same by value
      if (haveSameElements(payload, state.connectedWallet.supportedChainIds)) return

      Object.assign(state.connectedWallet, { supportedChainIds: payload })
    }),
    upsertAccountMetadata: create.reducer(
      (
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
    ),
    clearWalletMetadata: create.reducer((draftState, { payload }: { payload: WalletId }) => {
      const walletId = payload
      // Clear AccountIds that were previously associated with that wallet
      draftState.wallet.byId[walletId] = []
      draftState.wallet.ids = draftState.wallet.ids.filter(id => id !== walletId)

      delete draftState.enabledAccountIds[walletId]

      // TODO(gomes): do we also want to clear draftState.accountMetadata entries themselves?
      // Theoretically, not doing so would make reloading these easier?
    }),
    clearWalletPortfolioState: create.reducer((draftState, { payload }: { payload: string }) => {
      const walletId = payload

      // Get all account IDs for this wallet before clearing
      const accountIds = draftState.wallet.byId[walletId] ?? []

      // Delete each account's metadata and balances
      accountIds.forEach(accountId => {
        delete draftState.accountMetadata.byId[accountId]
        delete draftState.accountBalances.byId[accountId]
        delete draftState.accounts.byId[accountId]
      })

      // Update the IDs arrays to remove deleted accounts
      draftState.accountMetadata.ids = draftState.accountMetadata.ids.filter(
        id => !accountIds.includes(id),
      )
      draftState.accountBalances.ids = draftState.accountBalances.ids.filter(
        id => !accountIds.includes(id),
      )
      draftState.accounts.ids = draftState.accounts.ids.filter(id => !accountIds.includes(id))

      // Clear the wallet mapping
      delete draftState.wallet.byId[walletId]
      draftState.wallet.ids = draftState.wallet.ids.filter(id => id !== walletId)
      delete draftState.enabledAccountIds[walletId]
    }),
    upsertPortfolio: create.reducer(
      (draftState, { payload }: { payload: Pick<Portfolio, 'accounts' | 'accountBalances'> }) => {
        // upsert all
        draftState.accounts.byId = merge(draftState.accounts.byId, payload.accounts.byId)
        draftState.accounts.ids = Object.keys(draftState.accounts.byId)

        // Handle account balances
        Object.entries(payload.accountBalances.byId).forEach(([accountId, payloadBalances]) => {
          const existingBalances = draftState.accountBalances.byId[accountId] || {}

          const allAssetIds = new Set([
            ...Object.keys(existingBalances),
            ...Object.keys(payloadBalances),
          ])

          const newBalances: Record<string, string> = {}
          allAssetIds.forEach(assetId => {
            newBalances[assetId] = payloadBalances[assetId] ?? '0'
          })

          draftState.accountBalances.byId[accountId] = newBalances
        })

        draftState.accountBalances.ids = Object.keys(draftState.accountBalances.byId)
      },
    ),
    /**
     * Explicitly enable an account by its `AccountId`. Necessary where `use-strict` toggles twice
     * during initial load, leading to all auto-detected accounts being disabled.
     */
    enableAccountId: create.reducer(
      (draftState, { payload: accountId }: { payload: AccountId }) => {
        const walletId = draftState.connectedWallet?.id

        if (!walletId) return

        const enabledAccountIdsSet = new Set(draftState.enabledAccountIds[walletId])
        enabledAccountIdsSet.add(accountId)
        draftState.enabledAccountIds[walletId] = Array.from(enabledAccountIdsSet)
      },
    ),
    toggleAccountIdEnabled: create.reducer(
      (draftState, { payload: accountId }: { payload: AccountId }) => {
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
    ),
  }),
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
  selectors: {
    selectPortfolio: state => state,
    selectAccountsById: state => state.accounts.byId,
    selectAccountMetadataById: state => state.accountMetadata.byId,
    selectIsPortfolioGetAccountLoadingByAccountId: state =>
      state.isPortfolioGetAccountLoadingByAccountId,
    selectWalletId: state => state.connectedWallet?.id,
    selectWalletName: state => state.connectedWallet?.name,
    selectIsWalletConnected: state => state.connectedWallet !== undefined,
    selectWalletSupportedChainIds: state => state.connectedWallet?.supportedChainIds ?? [],
    selectAccountIdsByWalletId: state => state.wallet.byId,
    selectWalletIds: state => state.wallet.ids,
    selectAccountBalancesById: state => state.accountBalances.byId,
    selectEnabledAccountIds: state => state.enabledAccountIds,
  },
})

type GetAccountArgs = {
  accountId: AccountId
  upsertOnFetch?: boolean
}

type GetAccountsBatchArgs = {
  accountIds: AccountId[]
}

export const portfolioApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'portfolioApi',
  endpoints: build => ({
    getAccountsBatch: build.query<Portfolio, GetAccountsBatchArgs>({
      queryFn: async ({ accountIds }, { dispatch, getState }) => {
        if (accountIds.length === 0) return { data: cloneDeep(initialState) }

        accountIds.forEach(accountId => {
          dispatch(
            portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: true }),
          )
        })

        const state: ReduxState = getState() as any
        const assetIds = state.assets.ids
        const chainAdapters = getChainAdapterManager()

        try {
          const { selectFeatureFlag } = await import('@/state/slices/preferencesSlice/selectors')
          const { store } = await import('@/state/store')
          const isGraphQLEnabled = selectFeatureFlag(store.getState(), 'GraphQLPoc')

          let combinedPortfolio = cloneDeep(initialState)

          if (isGraphQLEnabled) {
            const { fetchAccountsGraphQL, prefetchPortalsAccounts } = await import('@/lib/graphql')
            const { evmChainIds } = await import('@shapeshiftoss/chain-adapters')
            console.log(`[Portfolio] Fetching ${accountIds.length} accounts via GraphQL batch`)
            const graphqlAccounts = await fetchAccountsGraphQL(accountIds)

            const evmAccounts = accountIds
              .map(accountId => {
                const { chainId, account: pubkey } = fromAccountId(accountId)
                return { chainId, owner: pubkey }
              })
              .filter(({ chainId }) => evmChainIds.includes(chainId as any))

            if (evmAccounts.length > 0) {
              console.log(
                `[Portfolio] Prefetching Portals data for ${evmAccounts.length} EVM accounts`,
              )
              await prefetchPortalsAccounts(evmAccounts)
            }

            for (const accountId of accountIds) {
              const { chainId, account: pubkey } = fromAccountId(accountId)
              const graphqlAccount = graphqlAccounts[accountId]

              if (!graphqlAccount) {
                combinedPortfolio.accounts.ids.push(accountId)
                combinedPortfolio.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
                continue
              }

              const details = graphqlAccount.details

              const mapTokens = (
                tokens: {
                  assetId: string
                  balance: string
                  symbol: string | null
                  name: string | null
                  precision: number | null
                }[],
                defaultPrecision: number,
              ) =>
                tokens.map(t => ({
                  assetId: t.assetId,
                  balance: t.balance,
                  symbol: t.symbol ?? '',
                  name: t.name ?? '',
                  precision: t.precision ?? defaultPrecision,
                }))

              const baseAccount = {
                balance: graphqlAccount.balance,
                pubkey: graphqlAccount.pubkey,
                chainId: graphqlAccount.chainId,
                assetId: graphqlAccount.assetId,
                chain: chainId,
              }

              let account: any

              if (details?.__typename === 'EvmAccountDetails') {
                account = {
                  ...baseAccount,
                  nonce: details.nonce ?? 0,
                  tokens: mapTokens(details.tokens ?? graphqlAccount.tokens, 18),
                }
              } else if (details?.__typename === 'UtxoAccountDetails') {
                account = {
                  ...baseAccount,
                  addresses: (details.addresses ?? []).map(a => ({
                    pubkey: a.pubkey,
                    balance: a.balance,
                  })),
                  nextChangeAddressIndex: details.nextChangeAddressIndex,
                  nextReceiveAddressIndex: details.nextReceiveAddressIndex,
                }
              } else if (details?.__typename === 'CosmosAccountDetails') {
                account = {
                  ...baseAccount,
                  sequence: details.sequence,
                  accountNumber: details.accountNumber,
                  delegations: details.delegations ?? [],
                  redelegations: details.redelegations ?? [],
                  undelegations: details.undelegations ?? [],
                  rewards: details.rewards ?? [],
                }
              } else if (details?.__typename === 'SolanaAccountDetails') {
                account = {
                  ...baseAccount,
                  tokens: mapTokens(details.tokens ?? graphqlAccount.tokens, 9),
                }
              } else {
                account = {
                  ...baseAccount,
                  tokens: mapTokens(graphqlAccount.tokens, 18),
                }
              }

              const portfolioAccounts = { [pubkey]: account }

              fetchIsSmartContractAddressQuery(pubkey, chainId)

              const assets = await makeAssets({
                chainId,
                pubkey,
                state,
                portfolioAccounts,
              })

              if (assets) dispatch(assetSlice.actions.upsertAssets(assets))

              const accountPortfolio = accountToPortfolio({
                portfolioAccounts,
                assetIds: assetIds.concat(assets?.ids ?? []),
              })

              combinedPortfolio = merge(combinedPortfolio, accountPortfolio)
            }
          } else {
            for (const accountId of accountIds) {
              const { chainId, account: pubkey } = fromAccountId(accountId)
              const adapter = chainAdapters.get(chainId)

              if (!adapter) {
                combinedPortfolio.accounts.ids.push(accountId)
                combinedPortfolio.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
                continue
              }

              try {
                const account = await adapter.getAccount(pubkey)
                const portfolioAccounts = { [pubkey]: account }

                fetchIsSmartContractAddressQuery(pubkey, chainId)

                const assets = await makeAssets({
                  chainId,
                  pubkey,
                  state,
                  portfolioAccounts,
                })

                if (assets) dispatch(assetSlice.actions.upsertAssets(assets))

                const accountPortfolio = accountToPortfolio({
                  portfolioAccounts,
                  assetIds: assetIds.concat(assets?.ids ?? []),
                })

                combinedPortfolio = merge(combinedPortfolio, accountPortfolio)
              } catch (e) {
                console.error(`Error fetching account ${accountId}:`, e)
                combinedPortfolio.accounts.ids.push(accountId)
                combinedPortfolio.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
              }
            }
          }

          dispatch(portfolio.actions.upsertPortfolio(combinedPortfolio))

          accountIds.forEach(accountId => {
            dispatch(
              portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: false }),
            )
          })

          return { data: combinedPortfolio }
        } catch (e) {
          console.error('Batch account fetch error:', e)
          const data = cloneDeep(initialState)
          accountIds.forEach(accountId => {
            data.accounts.ids.push(accountId)
            data.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
            dispatch(
              portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: false }),
            )
          })
          dispatch(portfolio.actions.upsertPortfolio(data))
          return { data }
        }
      },
    }),
    getAccount: build.query<Portfolio, GetAccountArgs>({
      queryFn: async ({ accountId, upsertOnFetch }, { dispatch, getState }) => {
        dispatch(portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: true }))
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

          // Prefetch smart contract checks - do *not* await/.then() me, this is only for the purpose of having this cached later
          fetchIsSmartContractAddressQuery(pubkey, chainId)

          const data = await (async (): Promise<Portfolio> => {
            const assets = await makeAssets({
              chainId,
              pubkey,
              state,
              portfolioAccounts,
            })

            // upsert placeholder assets
            if (assets) dispatch(assetSlice.actions.upsertAssets(assets))

            return accountToPortfolio({
              portfolioAccounts,
              assetIds: assetIds.concat(assets?.ids ?? []),
            })
          })()

          upsertOnFetch && dispatch(portfolio.actions.upsertPortfolio(data))
          dispatch(
            portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: false }),
          )
          return { data }
        } catch (e) {
          console.error(e)
          const data = cloneDeep(initialState)
          data.accounts.ids.push(accountId)
          data.accounts.byId[accountId] = { assetIds: [], hasActivity: false }
          dispatch(portfolio.actions.upsertPortfolio(data))
          dispatch(
            portfolio.actions.setIsPortfolioGetAccountLoading({ accountId, isLoading: false }),
          )
          return { data }
        }
      },
    }),
  }),
})
