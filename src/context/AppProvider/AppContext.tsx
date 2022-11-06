import { AlertDescription, Button, Flex, useToast } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import {
  cosmosChainId,
  ethChainId,
  fromAccountId,
  osmosisChainId,
  toAccountId,
} from '@keepkey/caip'
import { supportsCosmos, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { entries } from 'lodash'
import isEmpty from 'lodash/isEmpty'
import uniq from 'lodash/uniq'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useDispatch, useSelector } from 'react-redux'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { logger } from 'lib/logger'
import { accountSpecifiers } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  useFindAllQuery,
  useFindByFiatSymbolQuery,
  useFindPriceHistoryByFiatSymbolQuery,
} from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectAssets,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectPortfolioLoadingStatusGranular,
  selectSelectedCurrency,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { txHistory, txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import {
  EMPTY_COSMOS_ADDRESS,
  EMPTY_OSMOSIS_ADDRESS,
} from 'state/slices/validatorDataSlice/constants'
import { validatorDataApi } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['AppContext'] })

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
  const accountErrorToastId = 'accountError'
  const translate = useTranslate()
  const dispatch = useDispatch()
  const { supportedChains } = usePlugins()
  const {
    state: { wallet },
    setNeedsReset,
  } = useWallet()
  const assets = useSelector(selectAssets)
  const assetIds = useSelector(selectAssetIds)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const portfolioLoadingStatusGranular = useSelector(selectPortfolioLoadingStatusGranular)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const routeAssetId = useRouteAssetId()

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

  /**
   * handle wallet disconnect/switch logic
   */
  useEffect(() => {
    // if we have a wallet and changed account specifiers, we have switched wallets
    // NOTE! - the wallet will change before the account specifiers does, so clearing here is valid
    // check the console logs in the browser for the ordering of actions to verify this logic
    const switched = Boolean(wallet && !isEmpty(accountSpecifiersList))
    const disconnected = !wallet
    switched && moduleLogger.info('Wallet switched')
    disconnected && moduleLogger.info('Wallet disconnected')
    if (switched || disconnected) {
      dispatch(accountSpecifiers.actions.clear())
      dispatch(portfolio.actions.clear())
      dispatch(txHistory.actions.clear())
    }
    if (disconnected) {
      setNeedsReset(true)
    }
    // this effect changes accountSpecifiersList, don't create infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, wallet])

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      try {
        const accountNumber = 0
        const chainIds = supportedChains
        const accountMetadataByAccountId = await deriveAccountIdsAndMetadata({
          accountNumber,
          chainIds,
          wallet,
        })

        // TODO(0xdef1cafe): temporary transform for backwards compatibility until we kill accountSpecifiersSlice
        const accountSpecifiersPayload = Object.keys(accountMetadataByAccountId).map(accountId => {
          const { chainId, account } = fromAccountId(accountId)
          return { [chainId]: account }
        })

        dispatch(accountSpecifiers.actions.upsertAccountSpecifiers(accountSpecifiersPayload))
        dispatch(portfolio.actions.upsertAccountMetadata(accountMetadataByAccountId))
      } catch (e) {
        moduleLogger.error(e, 'AppContext:deriveAccountIdsAndMetadata')
      }
    })()
  }, [dispatch, wallet, supportedChains])

  // once account specifiers are set after wallet connect, fetch all account data to build out portfolio
  useEffect(() => {
    const { getAccount } = portfolioApi.endpoints

    accountSpecifiersList.forEach(accountSpecifierMap => {
      dispatch(getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true }))
    })
  }, [dispatch, accountSpecifiersList])

  // once portfolio is done loading, fetch all transaction history
  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return

    const { getAllTxHistory } = txHistoryApi.endpoints

    dispatch(getAllTxHistory.initiate({ accountSpecifiersList }, { forceRefetch: true }))
  }, [dispatch, accountSpecifiersList, portfolioLoadingStatus])

  // once portfolio is loaded, fetch remaining chain specific data
  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return

    const { getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints
    const { getValidatorData } = validatorDataApi.endpoints

    // forceRefetch is enabled here to make sure that we always have the latest state from chain
    // and ensure the queryFn runs resulting in dispatches occuring to update client state
    const options = { forceRefetch: true }

    // Sneaky hack to fetch cosmos SDK default opportunities for wallets that don't support Cosmos SDK
    // We only store the validator data for these and don't actually store them in portfolio.accounts.byId[accountSpecifier].stakingDataByValidatorId
    // Since the accountSpecifier is an empty address (generated and private keys burned) and isn't actually in state
    if (wallet && !supportsCosmos(wallet)) {
      const accountSpecifier = `${cosmosChainId}:${EMPTY_COSMOS_ADDRESS}`
      dispatch(getValidatorData.initiate({ accountSpecifier, chainId: cosmosChainId }, options))
    }
    if (wallet && !supportsOsmosis(wallet)) {
      const accountSpecifier = `${osmosisChainId}:${EMPTY_OSMOSIS_ADDRESS}`
      dispatch(getValidatorData.initiate({ accountSpecifier, chainId: osmosisChainId }, options))
    }

    accountSpecifiersList.forEach(accountSpecifierMap => {
      Object.entries(accountSpecifierMap).forEach(([chainId, account]) => {
        switch (chainId) {
          case cosmosChainId:
          case osmosisChainId:
            const accountSpecifier = toAccountId({ chainId, account })
            dispatch(getValidatorData.initiate({ accountSpecifier, chainId }, options))
            break
          case ethChainId:
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
              getFoxyRebaseHistoryByAccountId.initiate(
                { accountSpecifierMap, portfolioAssetIds },
                options,
              ),
            )
            break
          default:
        }
      })
    })
    // this effect cares specifically about changes to portfolio accounts or assets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, portfolioLoadingStatus, portfolioAccounts, portfolioAssetIds])

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

  const handleAccountErrorToastClose = useCallback(
    () => toast.isActive(accountErrorToastId) && toast.close(accountErrorToastId),
    [toast],
  )

  /**
   * portfolio loading error notification
   */
  useEffect(() => {
    const erroredAccountIds = entries(portfolioLoadingStatusGranular).reduce<AccountId[]>(
      (acc, [accountId, accountState]) => {
        accountState === 'error' && acc.push(accountId)
        return acc
      },
      [],
    )

    if (!erroredAccountIds.length) return // yay

    // we can have multiple accounts with the same name, dont show 'Bitcoin, Bitcoin, Bitcoin'
    const erroredAccountNames = uniq(
      erroredAccountIds.map(accountId => assets[accountIdToFeeAssetId(accountId)].name),
    ).join(', ')

    const handleRetry = () => {
      handleAccountErrorToastClose()
      erroredAccountIds.forEach(accountId => {
        const { chainId, account } = fromAccountId(accountId)
        const accountSpecifierMap = { [chainId]: account }
        dispatch(
          portfolioApi.endpoints.getAccount.initiate(
            { accountSpecifierMap },
            { forceRefetch: true },
          ),
        )
      })
    }
    const toastOptions = {
      position: 'top-right' as const,
      id: accountErrorToastId,
      title: translate('common.somethingWentWrong'),
      status: 'error' as const,
      description: (
        <Flex flexDir='column' gap={4} alignItems='flex-start'>
          <AlertDescription>
            {translate('common.accountError', { erroredAccountNames })}
          </AlertDescription>
          <Button colorScheme='red' onClick={handleRetry}>
            {translate('common.retry')}
          </Button>
        </Flex>
      ),
      isClosable: true,
      duration: null, // don't auto-dismiss
    }
    toast.isActive(accountErrorToastId)
      ? toast.update(accountErrorToastId, toastOptions)
      : toast(toastOptions)
  }, [
    assets,
    dispatch,
    handleAccountErrorToastClose,
    portfolioLoadingStatusGranular,
    toast,
    translate,
  ])

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
