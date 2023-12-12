import { useToast } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromAccountId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import difference from 'lodash/difference'
import React, { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useMixpanelPortfolioTracking } from 'hooks/useMixpanelPortfolioTracking/useMixpanelPortfolioTracking'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { setTimeoutAsync } from 'lib/utils'
import { nftApi } from 'state/apis/nft/nftApi'
import { snapshotApi } from 'state/apis/snapshot/snapshot'
import { zapper } from 'state/apis/zapper/zapperApi'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  marketData,
  useFindAllQuery,
} from 'state/slices/marketDataSlice/marketDataSlice'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import {
  fetchAllOpportunitiesIdsByChainId,
  fetchAllOpportunitiesMetadataByChainId,
  fetchAllOpportunitiesUserDataByAccountId,
} from 'state/slices/opportunitiesSlice/thunks'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetIds,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectSelectedCurrency,
  selectSelectedLocale,
  selectWalletAccountIds,
} from 'state/slices/selectors'
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
  const wallet = useWallet().state.wallet
  const assetIds = useSelector(selectAssetIds)
  const requestedAccountIds = useSelector(selectWalletAccountIds)
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const routeAssetId = useRouteAssetId()
  const DynamicLpAssets = useFeatureFlag('DynamicLpAssets')
  const isFoxDiscountsEnabled = useFeatureFlag('FoxDiscounts')
  const isSnapInstalled = useIsSnapInstalled()

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
    require(`dayjs/locale/${selectedLocale}.js`)
  }, [selectedLocale])

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      let chainIds = Array.from(supportedChains).filter(chainId =>
        walletSupportsChain({ chainId, wallet, isSnapInstalled }),
      )

      const accountMetadataByAccountId: AccountMetadataById = {}
      const isMultiAccountWallet = wallet.supportsBip44Accounts()
      for (let accountNumber = 0; chainIds.length > 0; accountNumber++) {
        // only some wallets support multi account
        if (accountNumber > 0 && !isMultiAccountWallet) break

        const input = { accountNumber, chainIds, wallet }
        const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)
        const accountIds = Object.keys(accountIdsAndMetadata)

        Object.assign(accountMetadataByAccountId, accountIdsAndMetadata)

        const { getAccount } = portfolioApi.endpoints
        const accountPromises = accountIds.map(accountId =>
          dispatch(getAccount.initiate({ accountId }, { forceRefetch: true })),
        )

        const accountResults = await Promise.allSettled(accountPromises)

        let chainIdsWithActivity: string[] = []
        accountResults.forEach((res, idx) => {
          if (res.status === 'rejected') return

          const { data: account } = res.value
          if (!account) return

          const accountId = accountIds[idx]
          const { chainId } = fromAccountId(accountId)
          const { hasActivity } = account.accounts.byId[accountId]

          // don't add accounts with no activity past account 0
          if (accountNumber > 0 && !hasActivity) return delete accountMetadataByAccountId[accountId]

          // unique set to handle utxo chains with multiple account types per account
          chainIdsWithActivity = Array.from(new Set([...chainIdsWithActivity, chainId]))

          dispatch(portfolio.actions.upsertPortfolio(account))
        })

        chainIds = chainIdsWithActivity
      }

      dispatch(portfolio.actions.upsertAccountMetadata(accountMetadataByAccountId))
    })()
  }, [dispatch, wallet, supportedChains, isSnapInstalled])

  useEffect(() => {
    if (!isFoxDiscountsEnabled) return
    if (portfolioLoadingStatus === 'loading') return

    dispatch(snapshotApi.endpoints.getVotingPower.initiate(undefined, { forceRefetch: true }))
  }, [dispatch, portfolioLoadingStatus, isFoxDiscountsEnabled])

  // once portfolio is done loading, fetch all transaction history
  useEffect(() => {
    ;(async () => {
      if (!requestedAccountIds.length) return
      if (portfolioLoadingStatus === 'loading') return

      const { getAllTxHistory } = txHistoryApi.endpoints

      await dispatch(getAllTxHistory.initiate(requestedAccountIds))
    })()
  }, [dispatch, requestedAccountIds, portfolioLoadingStatus])

  // once portfolio is loaded, fetch remaining chain specific data
  useEffect(() => {
    ;(async () => {
      if (!requestedAccountIds.length) return
      if (portfolioLoadingStatus === 'loading') return

      dispatch(nftApi.endpoints.getNftUserTokens.initiate({ accountIds: requestedAccountIds }))

      dispatch(zapper.endpoints.getZapperAppsBalancesOutput.initiate())

      const maybeFetchZapperData = DynamicLpAssets
        ? dispatch(zapper.endpoints.getZapperUniV2PoolAssetIds.initiate())
        : () => setTimeoutAsync(0)

      await maybeFetchZapperData

      requestedAccountIds.forEach(accountId => {
        const { chainId } = fromAccountId(accountId)
        switch (chainId) {
          case btcChainId:
          case ltcChainId:
          case dogeChainId:
          case bchChainId:
          case cosmosChainId:
          case bscChainId:
          case avalancheChainId:
            ;(async () => {
              await fetchAllOpportunitiesIdsByChainId(chainId)
              await fetchAllOpportunitiesMetadataByChainId(chainId)
              await fetchAllOpportunitiesUserDataByAccountId(accountId)
            })()
            break
          case ethChainId:
            ;(async () => {
              await fetchAllOpportunitiesIdsByChainId(chainId)
              await fetchAllOpportunitiesMetadataByChainId(chainId)
              await fetchAllOpportunitiesUserDataByAccountId(accountId)
            })()
            break
          default:
        }
      })
    })()
  }, [
    portfolioLoadingStatus,
    portfolioAccounts,
    DynamicLpAssets,
    dispatch,
    requestedAccountIds,
    portfolioAssetIds,
  ])

  const uniV2LpIdsData = useAppSelector(
    opportunitiesApi.endpoints.getOpportunityIds.select({
      defiType: DefiType.LiquidityPool,
      defiProvider: DefiProvider.UniV2,
    }),
  )

  const marketDataPollingInterval = 60 * 15 * 1000 // refetch data every 15 minutes
  useQuery({
    queryKey: ['marketData', {}],
    queryFn: async () => {
      // Exclude assets for which we are unable to get market data
      // We would fire query thunks / XHRs that would slow down the app
      // We insert price data for these as resolver-level, and are unable to get market data
      const excluded: AssetId[] = uniV2LpIdsData.data ?? []
      const portfolioAssetIdsExcludeNoMarketData = difference(portfolioAssetIds, excluded)

      // Only commented out to make it clear we do NOT want to use RTK options here
      // We use react-query as a wrapper because it allows us to disable refetch for background tabs
      // const opts = { subscriptionOptions: { pollingInterval: marketDataPollingInterval } }
      const timeframe = DEFAULT_HISTORY_TIMEFRAME

      await Promise.all([
        dispatch(
          marketApi.endpoints.findPriceHistoryByAssetIds.initiate(
            {
              timeframe,
              assetIds: portfolioAssetIdsExcludeNoMarketData,
            },
            // Since we use react-query as a polling wrapper, every initiate call *is* a force refetch here
            { forceRefetch: true },
          ),
        ),
        dispatch(
          marketApi.endpoints.findByAssetIds.initiate(portfolioAssetIdsExcludeNoMarketData, {
            // Since we use react-query as a polling wrapper, every initiate call *is* a force refetch here
            forceRefetch: true,
          }),
        ),
      ])

      // used to trigger mixpanel init after load of market data
      dispatch(marketData.actions.setMarketDataLoaded())

      // We *have* to return a value other than undefined from react-query queries, see
      // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
      return null
    },
    // once the portfolio is loaded, fetch market data for all portfolio assets
    // and start refetch timer to keep market data up to date
    enabled: portfolioLoadingStatus !== 'loading',
    refetchInterval: marketDataPollingInterval,
    // Do NOT refetch market data in background to avoid spamming coingecko
    refetchIntervalInBackground: false,
    // Do NOT refetch market data on window focus to avoid spamming coingecko
    refetchOnWindowFocus: false,
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
    dispatch(marketApi.endpoints.findByAssetIds.initiate([routeAssetId]))
  }, [dispatch, routeAssetId])

  // If the assets aren't loaded, then the app isn't ready to render
  // This fixes issues with refreshes on pages that expect assets to already exist
  return <>{Boolean(assetIds.length) && children}</>
}
