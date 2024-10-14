import { usePrevious, useToast } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { LedgerOpenAppEventArgs } from '@shapeshiftoss/chain-adapters'
import { emitter } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { useQueries } from '@tanstack/react-query'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { LanguageTypeEnum } from 'constants/LanguageTypeEnum'
import React, { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNfts } from 'components/Nfts/hooks/useNfts'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useMixpanelPortfolioTracking } from 'hooks/useMixpanelPortfolioTracking/useMixpanelPortfolioTracking'
import { useModal } from 'hooks/useModal/useModal'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { isUtxoChainId } from 'lib/utils/utxo'
import { snapshotApi } from 'state/apis/snapshot/snapshot'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  marketData,
  useFindAllQuery,
} from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdsByChainId,
  selectAssetIds,
  selectEnabledWalletAccountIds,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectSelectedCurrency,
  selectSelectedLocale,
  selectWalletId,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from 'state/store'

/**
 * note - be super careful playing with this component, as it's responsible for asset,
 * market data, and portfolio fetching, and we don't want to over or under fetch data,
 * from unchained, market apis, or otherwise. it's optimized such that it won't unnecessarily render
 *
 * e.g. unintentionally clearing the portfolio can create obscure bugs that don't manifest
 * for some time as reselect does a really good job of memoizing things
 *
 */

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const toast = useToast()
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { supportedChains } = usePlugins()
  const { wallet, isConnected } = useWallet().state
  const assetIds = useAppSelector(selectAssetIds)
  const requestedAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const portfolioAssetIds = useAppSelector(selectPortfolioAssetIds)
  const walletId = useAppSelector(selectWalletId)
  const routeAssetId = useRouteAssetId()
  const { isSnapInstalled } = useIsSnapInstalled()
  const previousIsSnapInstalled = usePrevious(isSnapInstalled)
  const { close: closeModal, open: openModal } = useModal('ledgerOpenApp')

  useEffect(() => {
    const handleLedgerOpenApp = ({ chainId, reject }: LedgerOpenAppEventArgs) => {
      const onCancel = () => {
        closeModal()
        reject()
      }

      openModal({ chainId, onCancel })
    }

    const handleLedgerAppOpened = () => {
      closeModal()
    }

    emitter.on('LedgerOpenApp', handleLedgerOpenApp)
    emitter.on('LedgerAppOpened', handleLedgerAppOpened)

    return () => {
      emitter.off('LedgerOpenApp', handleLedgerOpenApp)
      emitter.off('LedgerAppOpened', handleLedgerAppOpened)
    }
  })

  useNfts()

  // track anonymous portfolio
  useMixpanelPortfolioTracking()

  // immediately load all assets, before the wallet is even connected,
  // so the app is functional and ready
  // if we already have assets in store, we don't need to refetch the base assets, as these won't change
  // if they do, it means we regenerated generatedAssetData.json, and can run a migration to trigger a refetch of base assets
  useGetAssetsQuery(undefined, { skip: Boolean(assetIds.length) })

  // load top 1000 assets market data
  // this is needed to sort assets by market cap
  // and covers most assets users will have
  useFindAllQuery()

  const selectedLocale = useAppSelector(selectSelectedLocale)
  useEffect(() => {
    if (selectedLocale in LanguageTypeEnum ?? {}) {
      require(`dayjs/locale/${selectedLocale}.js`)
    }
  }, [selectedLocale])

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  useEffect(() => {
    if (!wallet) return
    const walletSupportedChainIds = supportedChains.filter(chainId => {
      return walletSupportsChain({
        chainId,
        wallet,
        isSnapInstalled,
        checkConnectedAccountIds: false, // don't check connected account ids, we're detecting initial runtime support for chains
      })
    })
    dispatch(portfolio.actions.setWalletSupportedChainIds(walletSupportedChainIds))
  }, [accountIdsByChainId, dispatch, isSnapInstalled, wallet, supportedChains])

  // Initial account and portfolio fetch for non-ledger wallets
  useEffect(() => {
    const hasManagedAccounts = (() => {
      // MM without snap doesn't allow account management - if the user just installed the snap, we know they don't have managed accounts
      if (!previousIsSnapInstalled && isSnapInstalled) return false
      // We know snap wasn't just installed in this render - so if there are any requestedAccountIds, we assume the user has managed accounts
      return requestedAccountIds.length > 0
    })()

    let chainIds = new Set(
      supportedChains.filter(chainId => {
        return walletSupportsChain({
          chainId,
          wallet,
          isSnapInstalled,
          checkConnectedAccountIds: false, // don't check connected account ids, we're detecting runtime support for chains
        })
      }),
    )
    if (!chainIds.size) return
    ;(async () => {
      dispatch(portfolio.actions.setIsAccountsMetadataLoading(true))

      // Fetch portfolio for all managed accounts if they exist instead of going through the initial account detection flow.
      // This ensures that we have fresh portfolio data, but accounts added through account management are not accidentally blown away.
      if (hasManagedAccounts) {
        requestedAccountIds.forEach(accountId => {
          dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
        })

        return
      }

      if (!wallet || isLedger(wallet)) return

      const walletId = await wallet.getDeviceID()

      const accountMetadataByAccountId: AccountMetadataById = {}
      const isMultiAccountWallet = wallet.supportsBip44Accounts()
      const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
      for (let accountNumber = 0; chainIds.size > 0; accountNumber++) {
        if (
          accountNumber > 0 &&
          // only some wallets support multi account
          (!isMultiAccountWallet ||
            // MM without snaps does not support non-EVM chains, hence no multi-account
            // since EVM chains in MM use MetaMask's native JSON-RPC functionality which doesn't support multi-account
            (isMetaMaskMultichainWallet && !isSnapInstalled))
        )
          break

        const input = {
          accountNumber,
          chainIds: Array.from(chainIds),
          wallet,
          isSnapInstalled: Boolean(isSnapInstalled),
        }
        const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)
        const accountIds = Object.keys(accountIdsAndMetadata)

        Object.assign(accountMetadataByAccountId, accountIdsAndMetadata)

        const { getAccount } = portfolioApi.endpoints

        const accountNumberAccountIdsByChainId = (
          _accountIds: AccountId[],
        ): Record<ChainId, AccountId[]> => {
          return _accountIds.reduce(
            (acc, _accountId) => {
              const { chainId } = fromAccountId(_accountId)

              if (!acc[chainId]) {
                acc[chainId] = []
              }
              acc[chainId].push(_accountId)

              return acc
            },
            {} as Record<ChainId, AccountId[]>,
          )
        }

        let chainIdsWithActivity: Set<ChainId> = new Set()
        // This allows every run of AccountIds per chain/accountNumber to run in parallel vs. all sequentally, so
        // we can run each item (usually one AccountId, except UTXOs which may contain many because of many scriptTypes) 's side effects immediately
        const accountNumberAccountIdsPromises = Object.values(
          accountNumberAccountIdsByChainId(accountIds),
        ).map(async accountIds => {
          const results = await Promise.allSettled(
            accountIds.map(async id => {
              const result = await dispatch(getAccount.initiate({ accountId: id }))
              return result
            }),
          )

          results.forEach((res, idx) => {
            if (res.status === 'rejected') return

            const { data: account } = res.value
            if (!account) return

            const accountId = accountIds[idx]
            const { chainId } = fromAccountId(accountId)

            const { hasActivity } = account.accounts.byId[accountId]

            const accountNumberHasChainActivity = !isUtxoChainId(chainId)
              ? hasActivity
              : // For UTXO AccountIds, we need to check if *any* of the scriptTypes have activity, not only the current one
                // else, we might end up with partial account data, with only the first 1 or 2 out of 3 scriptTypes
                // being upserted for BTC and LTC
                results.some((res, _idx) => {
                  if (res.status === 'rejected') return false
                  const { data: account } = res.value
                  if (!account) return false
                  const accountId = accountIds[_idx]
                  const { chainId: _chainId } = fromAccountId(accountId)
                  if (chainId !== _chainId) return false
                  return account.accounts.byId[accountId].hasActivity
                })

            // don't add accounts with no activity past account 0
            if (accountNumber > 0 && !accountNumberHasChainActivity) {
              chainIdsWithActivity.delete(chainId)
              delete accountMetadataByAccountId[accountId]
            } else {
              // handle utxo chains with multiple account types per account
              chainIdsWithActivity.add(chainId)

              dispatch(portfolio.actions.upsertPortfolio(account))
              const chainIdAccountMetadata = Object.entries(accountMetadataByAccountId).reduce(
                (acc, [accountId, metadata]) => {
                  const { chainId: _chainId } = fromAccountId(accountId)
                  if (chainId === _chainId) {
                    acc[accountId] = metadata
                  }
                  return acc
                },
                {} as AccountMetadataById,
              )
              dispatch(
                portfolio.actions.upsertAccountMetadata({
                  accountMetadataByAccountId: chainIdAccountMetadata,
                  walletId,
                }),
              )
              for (const accountId of Object.keys(accountMetadataByAccountId)) {
                dispatch(portfolio.actions.enableAccountId(accountId))
              }
            }
          })

          return results
        })

        await Promise.allSettled(accountNumberAccountIdsPromises)
        chainIds = chainIdsWithActivity
      }
    })().then(async () => {
      dispatch(portfolio.actions.setIsAccountsMetadataLoading(false))
      // Only fetch and upsert Tx history once all are loaded, otherwise big main thread rug
      const { getAllTxHistory } = txHistoryApi.endpoints

      await Promise.all(
        requestedAccountIds.map(requestedAccountId =>
          dispatch(getAllTxHistory.initiate(requestedAccountId)),
        ),
      )
    })
  }, [
    dispatch,
    wallet,
    supportedChains,
    isSnapInstalled,
    requestedAccountIds.length,
    previousIsSnapInstalled,
    requestedAccountIds,
  ])

  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return
    if (!isConnected) return

    // Fetch voting power in AppContext for swapper only - THORChain LP will be fetched JIT to avoid overfetching
    dispatch(
      snapshotApi.endpoints.getVotingPower.initiate({ model: 'SWAPPER' }, { forceRefetch: true }),
    )
  }, [dispatch, isConnected, portfolioLoadingStatus])

  // Resets the sell and buy asset AccountIDs on wallet change to that we don't get stale trade input account selections while we're loading the new wallet
  useEffect(() => {
    dispatch(tradeInput.actions.setSellAssetAccountId(undefined))
    dispatch(tradeInput.actions.setBuyAssetAccountId(undefined))
  }, [dispatch, walletId])

  const marketDataPollingInterval = 60 * 15 * 1000 // refetch data every 15 minutes
  useQueries({
    queries: portfolioAssetIds.map(assetId => ({
      queryKey: ['marketData', assetId],
      queryFn: async () => {
        await dispatch(
          marketApi.endpoints.findByAssetId.initiate(assetId, {
            // Since we use react-query as a polling wrapper, every initiate call *is* a force refetch here
            forceRefetch: true,
          }),
        )

        // used to trigger mixpanel init after load of market data
        dispatch(marketData.actions.setMarketDataLoaded())

        // We *have* to return a value other than undefined from react-query queries, see
        // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
        return null
      },
      // once the portfolio is loaded, fetch market data for all portfolio assets
      // and start refetch timer to keep market data up to date
      enabled: !isConnected || portfolioLoadingStatus !== 'loading',
      refetchInterval: marketDataPollingInterval,
      // Do NOT refetch market data in background to avoid spamming coingecko
      refetchIntervalInBackground: false,
      // Do NOT refetch market data on window focus to avoid spamming coingecko
      refetchOnWindowFocus: false,
    })),
  })

  /**
   * fetch forex spot and history for user's selected currency
   */
  const currency = useAppSelector(state => selectSelectedCurrency(state))

  useEffect(() => {
    // we already know 1usd costs 1usd
    if (currency === 'USD') return

    void (async () => {
      const timeframe = DEFAULT_HISTORY_TIMEFRAME
      const priceHistoryArgs = { symbol: currency, timeframe }
      const { error: fiatPriceHistoryError } = await dispatch(
        marketApi.endpoints.findPriceHistoryByFiatSymbol.initiate(priceHistoryArgs),
      )
      const { error: forexRateError } = await dispatch(
        marketApi.endpoints.findByFiatSymbol.initiate(priceHistoryArgs),
      )

      if (fiatPriceHistoryError || forexRateError) {
        toast({
          position: 'top-right',
          title: translate('multiCurrency.toast.title', { symbol: currency }),
          description: translate('multiCurrency.toast.description'),
          status: 'error',
          duration: null, // don't auto-dismiss
          isClosable: true,
        })
        dispatch(preferences.actions.setSelectedCurrency({ currency: 'USD' }))
      }
    })()
  }, [currency, dispatch, toast, translate])

  // market data single-asset fetch, will use cached version if available
  // This uses the assetId from /assets route
  useEffect(() => {
    // early return for routes that don't contain an assetId, no need to refetch marketData granularly
    if (!routeAssetId) return
    dispatch(marketApi.endpoints.findByAssetId.initiate(routeAssetId))
  }, [dispatch, routeAssetId])

  // If the assets aren't loaded, then the app isn't ready to render
  // This fixes issues with refreshes on pages that expect assets to already exist
  return <>{Boolean(assetIds.length) && children}</>
}
