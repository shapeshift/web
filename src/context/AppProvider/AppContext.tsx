import { usePrevious, useToast } from '@chakra-ui/react'
import type { LedgerOpenAppEventArgs } from '@shapeshiftoss/chain-adapters'
import { emitter } from '@shapeshiftoss/chain-adapters'
import { useQueries } from '@tanstack/react-query'
import React, { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useAccountsFetch } from './hooks/useAccountsFetch'

import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import { LanguageTypeEnum } from '@/constants/LanguageTypeEnum'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useActionCenterSubscribers } from '@/hooks/useActionCenterSubscribers/useActionCenterSubscribers'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useMixpanelPortfolioTracking } from '@/hooks/useMixpanelPortfolioTracking/useMixpanelPortfolioTracking'
import { useModal } from '@/hooks/useModal/useModal'
import { useRouteAssetId } from '@/hooks/useRouteAssetId/useRouteAssetId'
import { useTransactionsSubscriber } from '@/hooks/useTransactionsSubscriber'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import {
  marketApi,
  useFindAllMarketDataQuery,
} from '@/state/slices/marketDataSlice/marketDataSlice'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdsByChainId,
  selectAssetIds,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectWalletId,
} from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

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
  const { isLoadingLocalWallet, modal, wallet, isConnected } = useWallet().state
  const assetIds = useAppSelector(selectAssetIds)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const portfolioAssetIds = useAppSelector(selectPortfolioAssetIds)
  const walletId = useAppSelector(selectWalletId)
  const prevWalletId = usePrevious(walletId)
  const routeAssetId = useRouteAssetId()
  const { isSnapInstalled } = useIsSnapInstalled()
  const { close: closeModal, open: openModal } = useModal('ledgerOpenApp')

  // Previously <TransactionsProvider />
  useTransactionsSubscriber()
  useActionCenterSubscribers()

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

  // track anonymous portfolio
  useMixpanelPortfolioTracking()

  // Master hook for accounts fetch
  useAccountsFetch()

  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  useEffect(() => {
    if (selectedLocale in LanguageTypeEnum) {
      void import(`dayjs/locale/${selectedLocale}.js`)
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

  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return
    if (!isConnected) return
  }, [dispatch, isConnected, portfolioLoadingStatus])

  // Resets the sell and buy asset AccountIDs on wallet change to that we don't get stale trade input account selections while we're loading the new wallet
  useEffect(() => {
    if (!prevWalletId) return
    if (walletId === prevWalletId) return

    dispatch(tradeInput.actions.setSellAccountId(undefined))
    dispatch(tradeInput.actions.setBuyAccountId(undefined))
  }, [dispatch, prevWalletId, walletId])

  const marketDataPollingInterval = 60 * 15 * 1000 // refetch data every 15 minutes

  // load top 1000 assets market data
  // this is needed to sort assets by market cap
  // and covers most assets users will have
  const topAssetsMarketData = useFindAllMarketDataQuery(undefined, {
    skip: !isConnected || portfolioLoadingStatus === 'loading' || modal || isLoadingLocalWallet,
    pollingInterval: marketDataPollingInterval,
  })

  // Filter out held portfolio AssetIds by "not being part of top assets market-data" criteria
  const nonTopPortfolioAssetIds = useMemo(
    () =>
      portfolioAssetIds.filter(assetId => {
        const isTopAsset = topAssetsMarketData.data?.[assetId]
        return !isTopAsset
      }),
    [portfolioAssetIds, topAssetsMarketData.data],
  )

  // and only fetch granular market-data for assets that are not already in the top assets market data
  useQueries({
    queries: nonTopPortfolioAssetIds.map(assetId => ({
      queryKey: ['marketData', assetId],
      queryFn: async () => {
        await dispatch(
          marketApi.endpoints.findByAssetId.initiate(assetId, {
            // Since we use react-query as a polling wrapper, every initiate call *is* a force refetch here
            forceRefetch: true,
          }),
        )

        // We *have* to return a value other than undefined from react-query queries, see
        // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
        return null
      },
      // once the portfolio is loaded, fetch market data for all portfolio assets
      // and start refetch timer to keep market data up to date
      enabled:
        isConnected &&
        topAssetsMarketData.status !== 'pending' &&
        portfolioLoadingStatus !== 'loading' &&
        !modal &&
        !isLoadingLocalWallet,
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
  const currency = useAppSelector(preferences.selectors.selectSelectedCurrency)

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
