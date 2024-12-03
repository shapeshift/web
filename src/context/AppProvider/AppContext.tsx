import { usePrevious, useToast } from '@chakra-ui/react'
import type { LedgerOpenAppEventArgs } from '@shapeshiftoss/chain-adapters'
import { emitter } from '@shapeshiftoss/chain-adapters'
import { useQueries } from '@tanstack/react-query'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { LanguageTypeEnum } from 'constants/LanguageTypeEnum'
import React, { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useMixpanelPortfolioTracking } from 'hooks/useMixpanelPortfolioTracking/useMixpanelPortfolioTracking'
import { useModal } from 'hooks/useModal/useModal'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { snapshotApi } from 'state/apis/snapshot/snapshot'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  marketData,
  useFindAllQuery,
} from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdsByChainId,
  selectAssetIds,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectSelectedCurrency,
  selectSelectedLocale,
  selectWalletId,
} from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useAccountsFetchQuery } from './hooks/useAccountsFetchQuery'

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
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const portfolioAssetIds = useAppSelector(selectPortfolioAssetIds)
  const walletId = useAppSelector(selectWalletId)
  const prevWalletId = usePrevious(walletId)
  const routeAssetId = useRouteAssetId()
  const { isSnapInstalled } = useIsSnapInstalled()
  const { close: closeModal, open: openModal } = useModal('ledgerOpenApp')
  const isThorFreeFeesEnabled = useFeatureFlag('ThorFreeFees')

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

  // immediately load all assets, before the wallet is even connected,
  // so the app is functional and ready
  // if we already have assets in store, we don't need to refetch the base assets, as these won't change
  // if they do, it means we regenerated generatedAssetData.json, and can run a migration to trigger a refetch of base assets
  useGetAssetsQuery(undefined, { skip: Boolean(assetIds.length) })

  // load top 1000 assets market data
  // this is needed to sort assets by market cap
  // and covers most assets users will have
  useFindAllQuery()

  // Master hook for accounts fetch as a react-query
  useAccountsFetchQuery()

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

  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return
    if (!isConnected) return

    // Fetch voting power in AppContext for swapper only - THORChain LP will be fetched JIT to avoid overfetching
    dispatch(
      snapshotApi.endpoints.getVotingPower.initiate({ model: 'SWAPPER' }, { forceRefetch: true }),
    )

    if (isThorFreeFeesEnabled) {
      dispatch(snapshotApi.endpoints.getThorVotingPower.initiate(undefined, { forceRefetch: true }))
    }
  }, [dispatch, isConnected, portfolioLoadingStatus, isThorFreeFeesEnabled])

  // Resets the sell and buy asset AccountIDs on wallet change to that we don't get stale trade input account selections while we're loading the new wallet
  useEffect(() => {
    if (!prevWalletId) return
    if (walletId === prevWalletId) return

    dispatch(tradeInput.actions.setSellAccountId(undefined))
    dispatch(tradeInput.actions.setBuyAccountId(undefined))
  }, [dispatch, prevWalletId, walletId])

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
