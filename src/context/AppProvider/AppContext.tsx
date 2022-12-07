import { useToast } from '@chakra-ui/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, ethChainId, fromAccountId, osmosisChainId } from '@shapeshiftoss/caip'
import { supportsCosmos, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import pull from 'lodash/pull'
import React, { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  useFindAllQuery,
  useFindByFiatSymbolQuery,
  useFindPriceHistoryByFiatSymbolQuery,
} from 'state/slices/marketDataSlice/marketDataSlice'
import {
  fetchAllOpportunitiesIds,
  fetchAllOpportunitiesMetadata,
  fetchAllOpportunitiesUserData,
} from 'state/slices/opportunitiesSlice/thunks'
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
import {
  EMPTY_COSMOS_ADDRESS,
  EMPTY_OSMOSIS_ADDRESS,
} from 'state/slices/validatorDataSlice/constants'
import { validatorDataApi } from 'state/slices/validatorDataSlice/validatorDataSlice'
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

    dispatch(getAllTxHistory.initiate(requestedAccountIds))
  }, [dispatch, requestedAccountIds, portfolioLoadingStatus])

  // once portfolio is loaded, fetch remaining chain specific data
  useEffect(() => {
    ;(async () => {
      if (portfolioLoadingStatus === 'loading') return

      const { getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints
      const { getValidatorData } = validatorDataApi.endpoints

      // forceRefetch is enabled here to make sure that we always have the latest state from chain
      // and ensure the queryFn runs resulting in dispatches occuring to update client state
      const options = { forceRefetch: true }

      // Sneaky hack to fetch cosmos SDK default opportunities for wallets that don't support Cosmos SDK
      // We only store the validator data for these and don't actually store them in portfolio.accounts.byId[accountId].stakingDataByValidatorId
      // Since the accountId is an empty address (generated and private keys burned) and isn't actually in state
      if (wallet && !supportsCosmos(wallet)) {
        const accountId = `${cosmosChainId}:${EMPTY_COSMOS_ADDRESS}`
        dispatch(getValidatorData.initiate(accountId, options))
      }
      if (wallet && !supportsOsmosis(wallet)) {
        const accountId = `${osmosisChainId}:${EMPTY_OSMOSIS_ADDRESS}`
        dispatch(getValidatorData.initiate(accountId, options))
      }

      await fetchAllOpportunitiesIds()
      await fetchAllOpportunitiesMetadata()

      requestedAccountIds.forEach(accountId => {
        const { chainId } = fromAccountId(accountId)
        switch (chainId) {
          case cosmosChainId:
          case osmosisChainId:
            dispatch(getValidatorData.initiate(accountId, options))
            break
          case ethChainId:
            // Don't await me, we don't want to block execution while this resolves and populates the store
            fetchAllOpportunitiesUserData(accountId)

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
            dispatch(
              getFoxyRebaseHistoryByAccountId.initiate({ accountId, portfolioAssetIds }, options),
            )
            break
          default:
        }
      })
    })()
  }, [
    dispatch,
    portfolioLoadingStatus,
    portfolioAccounts,
    portfolioAssetIds,
    wallet,
    requestedAccountIds,
  ])

  // once the portfolio is loaded, fetch market data for all portfolio assets
  // start refetch timer to keep market data up to date
  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return

    const fetchMarketData = () =>
      portfolioAssetIds.forEach(assetId => {
        dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
        const timeframe = DEFAULT_HISTORY_TIMEFRAME
        const payload = { assetId, timeframe }
        dispatch(marketApi.endpoints.findPriceHistoryByAssetId.initiate(payload))
      })

    fetchMarketData() // fetch every time assetIds change
    const interval = setInterval(fetchMarketData, 1000 * 60 * 2) // refetch every two minutes
    return () => clearInterval(interval) // clear interval when portfolioAssetIds change
  }, [dispatch, portfolioLoadingStatus, portfolioAssetIds])

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
