import { useToast } from '@chakra-ui/react'
import {
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosChainId,
  ethChainId,
  fromChainId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import {
  bip32ToAddressNList,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsEthSwitchChain,
  supportsOsmosis,
} from '@shapeshiftoss/hdwallet-core'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import isEmpty from 'lodash/isEmpty'
import React, { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useDispatch, useSelector } from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import {
  AccountSpecifierMap,
  accountSpecifiers,
} from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  useFindAllQuery,
  useFindByFiatSymbolQuery,
  useFindPriceHistoryByFiatSymbolQuery,
} from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectAssets,
  selectIsPortfolioLoaded,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectSelectedCurrency,
  selectSelectedLocale,
  selectTxHistoryStatus,
} from 'state/slices/selectors'
import { txHistory, txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { validatorDataApi } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['AppContext'] })

/**
 * note - be super careful playing with this component, as it's responsible for asset,
 * market data, and portfolio fetching, and we don't want to over or under fetch data,
 * from unchained, market apis, or otherwise. it's optimized such that it won't unnecessarily
 * render, and is closely related to src/hooks/useAccountSpecifiers/useAccountSpecifiers.ts
 *
 * e.g. unintentionally clearing the portfolio can create obscure bugs that don't manifest
 * for some time as reselect does a really good job of memoizing things
 *
 */
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const toast = useToast()
  const translate = useTranslate()
  const dispatch = useDispatch()
  const { supportedChains } = usePlugins()
  const chainAdapterManager = getChainAdapterManager()
  const {
    state: {
      wallet,
      deviceState: { disposition },
    },
  } = useWallet()
  const assetsById = useSelector(selectAssets)
  const assetIds = useSelector(selectAssetIds)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)
  const isPortfolioLoaded = useSelector(selectIsPortfolioLoaded)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const routeAssetId = useRouteAssetId()
  const txHistoryStatus = useAppSelector(selectTxHistoryStatus)

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
    // this effect changes accountSpecifiersList, don't create infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, wallet])

  /**
   * this was previously known as the useAccountSpecifiers hook
   * this has recently been moved into redux state, as hooks are not singletons,
   * and we needed to call useAccountSpecifiers in multiple places, namely here
   * in the portfolio context, and in the transactions provider
   *
   * this effect now sets this globally in state, and it can be consumed via
   * the selectAccountSpecifiers selector
   *
   * break this at your peril
   */
  useEffect(() => {
    if (isEmpty(assetsById)) return
    if (!wallet) return
    ;(async () => {
      try {
        const acc: AccountSpecifierMap[] = []

        for (const chainId of supportedChains) {
          const adapter = chainAdapterManager.get(chainId)
          if (!adapter) continue

          const { chainNamespace, chainReference } = fromChainId(chainId)

          switch (chainNamespace) {
            case CHAIN_NAMESPACE.Bitcoin: {
              if (!supportsBTC(wallet)) continue

              const utxoAdapter = adapter as unknown as UtxoBaseAdapter<UtxoChainId>

              for (const accountType of utxoAdapter.getSupportedAccountTypes()) {
                const { bip44Params, scriptType } = utxoAccountParams(chainId, accountType, 0)
                const pubkeys = await wallet.getPublicKeys([
                  {
                    coin: utxoAdapter.getCoinName(),
                    addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
                    curve: 'secp256k1',
                    scriptType,
                  },
                ])

                if (!pubkeys?.[0]?.xpub) throw new Error('failed to get public key')

                const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)
                if (!pubkey) continue

                acc.push({ [chainId]: pubkey })
              }
              break
            }

            case CHAIN_NAMESPACE.Ethereum: {
              if (chainReference === CHAIN_REFERENCE.EthereumMainnet) {
                if (!supportsETH(wallet)) continue
              }
              if (chainReference === CHAIN_REFERENCE.AvalancheCChain) {
                if (!supportsEthSwitchChain(wallet)) continue
              }

              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              acc.push({ [chainId]: pubkey.toLowerCase() })
              break
            }
            case CHAIN_NAMESPACE.Cosmos: {
              if (chainReference === CHAIN_REFERENCE.CosmosHubMainnet) {
                if (!supportsCosmos(wallet)) continue
              }
              if (chainReference === CHAIN_REFERENCE.OsmosisMainnet) {
                if (!supportsOsmosis(wallet)) continue
              }

              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              acc.push({ [chainId]: pubkey })
              break
            }
            default:
              break
          }
        }

        dispatch(accountSpecifiers.actions.setAccountSpecifiers(acc))
      } catch (e) {
        console.error('useAccountSpecifiers:getAccountSpecifiers:Error', e)
      }
    })()
  }, [assetsById, chainAdapterManager, dispatch, wallet, supportedChains, disposition])

  // once account specifiers are set after wallet connect, fetch all account data to build out portfolio
  useEffect(() => {
    const { getAccount } = portfolioApi.endpoints

    accountSpecifiersList.forEach(accountSpecifierMap => {
      dispatch(getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true }))
    })
  }, [dispatch, accountSpecifiersList])

  // once portfolio is done loading, fetch all transaction history
  useEffect(() => {
    if (!isPortfolioLoaded) return

    const { getAllTxHistory } = txHistoryApi.endpoints

    dispatch(getAllTxHistory.initiate({ accountSpecifiersList }, { forceRefetch: true }))
  }, [dispatch, accountSpecifiersList, isPortfolioLoaded])

  // once portfolio and transaction history are done loading, fetch remaining chain specific data
  useEffect(() => {
    if (!isPortfolioLoaded) return
    if (txHistoryStatus !== 'loaded') return

    const { getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints
    const { getValidatorData } = validatorDataApi.endpoints

    // forceRefetch is enabled here to make sure that we always have the latest state from chain
    // and ensure the queryFn runs resulting in dispatches occuring to update client state
    const options = { forceRefetch: true }

    accountSpecifiersList.forEach(accountSpecifierMap => {
      Object.entries(accountSpecifierMap).forEach(([chainId, account]) => {
        switch (chainId) {
          case cosmosChainId:
          case osmosisChainId:
            const accountSpecifier = `${chainId}:${account}`
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
  }, [dispatch, isPortfolioLoaded, portfolioAccounts, portfolioAssetIds, txHistoryStatus])

  // once the portfolio and transaction history are done loading, fetch market data for all portfolio assets
  // start refetch timer to keep market data up to date
  useEffect(() => {
    if (!isPortfolioLoaded) return
    if (txHistoryStatus !== 'loaded') return

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
  }, [dispatch, isPortfolioLoaded, portfolioAssetIds, txHistoryStatus])

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
