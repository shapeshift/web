import { useToast } from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromAccountId,
  ltcChainId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import difference from 'lodash/difference'
import pull from 'lodash/pull'
import React, { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useMixpanelPortfolioTracking } from 'hooks/useMixpanelPortfolioTracking/useMixpanelPortfolioTracking'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { setTimeoutAsync } from 'lib/utils'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'
import { zapper, zapperApi } from 'state/apis/zapper/zapperApi'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  useFindAllQuery,
  useFindByFiatSymbolQuery,
  useFindPriceHistoryByFiatSymbolQuery,
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

  // track anonymous portfolio
  useMixpanelPortfolioTracking()

  // load fiat ramps
  useGetFiatRampsQuery()

  // immediately load all assets, before the wallet is even connected,
  // so the app is functional and ready
  useGetAssetsQuery()

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
      const chainIds = Array.from(supportedChains).filter(chainId =>
        walletSupportsChain({ chainId, wallet }),
      )
      const isMultiAccountWallet = wallet.supportsBip44Accounts()
      for (let accountNumber = 0; chainIds.length > 0; accountNumber++) {
        // only some wallets support multi account
        if (accountNumber > 0 && !isMultiAccountWallet) break
        const input = { accountNumber, chainIds, wallet }
        const accountMetadataByAccountId = await deriveAccountIdsAndMetadata(input)
        const accountIds: AccountId[] = Object.keys(accountMetadataByAccountId)
        const { getAccount } = portfolioApi.endpoints
        const opts = { forceRefetch: true }
        // do *not* upsertOnFetch here - we need to check if the fetched account is empty
        const accountPromises = accountIds.map(accountId =>
          dispatch(getAccount.initiate({ accountId }, opts)),
        )
        const accountResults = await Promise.allSettled(accountPromises)
        /**
         * because UTXO chains can have multiple accounts per number, we need to aggregate
         * balance by chain id to see if we fetch the next by accountNumber
         */
        const balanceByChainId = accountResults.reduce<Record<ChainId, BN>>((acc, res, idx) => {
          if (res.status === 'rejected') return acc
          const { data: account } = res.value
          if (!account) return acc
          const accountId = accountIds[idx]
          const { chainId } = fromAccountId(accountId)
          const accountBalance = Object.values(account.accountBalances.byId).reduce<BN>(
            (acc, byAssetId) => {
              Object.values(byAssetId).forEach(balance => (acc = acc.plus(bnOrZero(balance))))
              return acc
            },
            bnOrZero(0),
          )
          acc[chainId] = bnOrZero(acc[chainId]).plus(accountBalance)
          // don't upsert empty accounts past account 0
          if (accountNumber > 0 && accountBalance.eq(0)) return acc
          const accountMetadata = accountMetadataByAccountId[accountId]
          const payload = { [accountId]: accountMetadata }
          dispatch(portfolio.actions.upsertAccountMetadata(payload))
          dispatch(portfolio.actions.upsertPortfolio(account))
          return acc
        }, {})

        /**
         * if the balance for all accounts for the current chainId and accountNumber
         * is zero, we've exhausted that chain, don't fetch more of them
         */
        Object.entries(balanceByChainId).forEach(([chainId, balance]) => {
          if (balance.eq(0)) pull(chainIds, chainId) // pull mutates chainIds, but we want to
        })
      }
    })()
  }, [dispatch, wallet, supportedChains])

  // once portfolio is done loading, fetch all transaction history
  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return

    const { getAllTxHistory } = txHistoryApi.endpoints

    requestedAccountIds.forEach(accountId => dispatch(getAllTxHistory.initiate(accountId)))
  }, [dispatch, requestedAccountIds, portfolioLoadingStatus])

  // once portfolio is loaded, fetch remaining chain specific data
  useEffect(() => {
    ;(async () => {
      if (portfolioLoadingStatus === 'loading') return

      const { getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints

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
          case osmosisChainId:
          case avalancheChainId:
            ;(async () => {
              zapperApi.endpoints.getZapperAppsBalancesOutput.initiate()

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

            /**
             * fetch all rebase history for foxy
             *
             * foxy rebase history is most closely linked to transactions.
             * unfortunately, we have to call this for a specific asset here
             * because we need it for the dashboard balance chart
             *
             * if you're reading this and are about to add another rebase token here,
             * stop, and make a getRebaseHistoryByAccountId that takes
             * an accountId and assetId[] in the txHistoryApi
             */
            dispatch(getFoxyRebaseHistoryByAccountId.initiate({ accountId, portfolioAssetIds }))
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

  // once the portfolio is loaded, fetch market data for all portfolio assets
  // start refetch timer to keep market data up to date
  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return

    // Exclude assets for which we are unable to get market data
    // We would fire query thunks / XHRs that would slow down the app
    // We insert price data for these as resolver-level, and are unable to get market data
    const excluded: AssetId[] = uniV2LpIdsData.data ?? []
    const portfolioAssetIdsExcludeNoMarketData = difference(portfolioAssetIds, excluded)

    // https://redux-toolkit.js.org/rtk-query/api/created-api/endpoints#initiate
    // TODO(0xdef1cafe): bring polling back once we point at markets.shapeshift.com
    // const pollingInterval = 1000 * 2 * 60 // refetch data every two minutes
    // const opts = { subscriptionOptions: { pollingInterval } }
    const timeframe = DEFAULT_HISTORY_TIMEFRAME

    portfolioAssetIdsExcludeNoMarketData.forEach(assetId => {
      dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
      const payload = { assetId, timeframe }
      dispatch(marketApi.endpoints.findPriceHistoryByAssetId.initiate(payload))
    })
  }, [dispatch, portfolioLoadingStatus, portfolioAssetIds, uniV2LpIdsData.data])

  /**
   * fetch forex spot and history for user's selected currency
   */
  const currency = useAppSelector(state => selectSelectedCurrency(state))
  const timeframe = DEFAULT_HISTORY_TIMEFRAME
  const priceHistoryArgs = useMemo(() => ({ symbol: currency, timeframe }), [currency, timeframe])
  const { error: fiatPriceHistoryError } = useFindPriceHistoryByFiatSymbolQuery(priceHistoryArgs)
  const { error: forexRateError } = useFindByFiatSymbolQuery(priceHistoryArgs)

  useEffect(() => {
    /**
     * crypto market data is denominated in USD and is the "safe" condition we can
     * recover from failures on
     */
    if (currency === 'USD') return
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
    // setting symbol causes infinite render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, fiatPriceHistoryError, forexRateError, toast])

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
