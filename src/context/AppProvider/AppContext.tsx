import {
  ASSET_REFERENCE,
  cosmosChainId,
  ethChainId,
  toAssetId,
  toChainId,
} from '@shapeshiftoss/caip'
import {
  bitcoin,
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams,
} from '@shapeshiftoss/chain-adapters'
import {
  bip32ToAddressNList,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsOsmosis,
} from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, HistoryTimeframe, NetworkTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import {
  AccountSpecifierMap,
  accountSpecifiers,
} from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectAssets,
  selectIsPortfolioLoaded,
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { validatorDataApi } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { useAppSelector } from 'state/store'

const moduleLogger = logger.child({ namespace: ['AppContext'] })

// used by AssetChart, Portfolio, and this file to prefetch price history
export const DEFAULT_HISTORY_TIMEFRAME = HistoryTimeframe.MONTH

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
  const dispatch = useDispatch()
  const { chainAdapterManager, supportedChains } = usePlugins()
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

  // immediately load all assets, before the wallet is even connected,
  // so the app is functional and ready
  useGetAssetsQuery()

  // load top 1000 assets market data
  // this is needed to sort assets by market cap
  // and covers most assets users will have
  useFindAllQuery()

  // once the wallet is connected, reach out to unchained to fetch
  // accounts for each chain/account specifier combination
  useEffect(() => {
    const { getAccount } = portfolioApi.endpoints
    const { getAllTxHistory } = txHistoryApi.endpoints

    // forceRefetch is enabled here to make sure that we always have the latest state from chain
    // and ensure the queryFn runs resulting in dispatches occuring to update client state
    const options = { forceRefetch: true }

    accountSpecifiersList.forEach(accountSpecifierMap => {
      // fetch account data
      dispatch(getAccount.initiate({ accountSpecifierMap }, options))

      // fetch tx history
      dispatch(getAllTxHistory.initiate({ accountSpecifierMap }, options))
    })
  }, [dispatch, accountSpecifiersList])

  useEffect(() => {
    if (!isPortfolioLoaded) return

    const { getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints
    const { getValidatorData } = validatorDataApi.endpoints

    // forceRefetch is enabled here to make sure that we always have the latest state from chain
    // and ensure the queryFn runs resulting in dispatches occuring to update client state
    const options = { forceRefetch: true }

    accountSpecifiersList.forEach(accountSpecifierMap => {
      Object.entries(accountSpecifierMap).forEach(([chainId, account]) => {
        switch (chainId) {
          case cosmosChainId:
            const accountSpecifier = `${chainId}:${account}`
            dispatch(getValidatorData.initiate({ accountSpecifier }, options))
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
  }, [dispatch, isPortfolioLoaded, portfolioAccounts, portfolioAssetIds])

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

        for (const chain of supportedChains) {
          const adapter = chainAdapterManager.byChain(chain)

          switch (chain) {
            // TODO: Handle Cosmos ChainType here
            case ChainTypes.Ethereum: {
              if (!supportsETH(wallet)) continue
              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              const chainId = toChainId({ chain, network: NetworkTypes.MAINNET })
              acc.push({ [chainId]: pubkey.toLowerCase() })
              break
            }
            case ChainTypes.Bitcoin: {
              if (!supportsBTC(wallet)) continue
              const assetId = toAssetId({
                chain,
                network: NetworkTypes.MAINNET,
                assetNamespace: 'slip44',
                assetReference: ASSET_REFERENCE.Bitcoin,
              })
              const bitcoin = assetsById[assetId]

              if (!bitcoin) continue
              const supportedAccountTypes = (
                adapter as bitcoin.ChainAdapter
              ).getSupportedAccountTypes()
              for (const accountType of supportedAccountTypes) {
                const accountParams = utxoAccountParams(bitcoin, accountType, 0)
                const { bip44Params, scriptType } = accountParams
                const pubkeys = await wallet.getPublicKeys([
                  {
                    coin: adapter.getType(),
                    addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
                    curve: 'secp256k1',
                    scriptType,
                  },
                ])
                if (!pubkeys?.[0]?.xpub) {
                  throw new Error(`usePubkeys: error getting bitcoin xpub`)
                }
                const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)

                if (!pubkey) continue
                const chainId = toChainId({ chain, network: NetworkTypes.MAINNET })
                acc.push({ [chainId]: pubkey })
              }
              break
            }
            case ChainTypes.Cosmos: {
              if (!supportsCosmos(wallet)) continue
              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              const chainId = toChainId({ chain, network: NetworkTypes.COSMOSHUB_MAINNET })
              acc.push({ [chainId]: pubkey })
              break
            }
            case ChainTypes.Osmosis: {
              if (!supportsOsmosis(wallet)) continue
              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              const chainId = toChainId({ chain, network: NetworkTypes.OSMOSIS_MAINNET })
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


  // market data pre and refetch management
  // we only prefetch market data for the top 1000 assets
  // once the portfolio has loaded, check we have market data
  // for more obscure assets, if we don't have it, fetch it
  useEffect(() => {
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
  }, [portfolioAssetIds, dispatch])

  /**
   * fetch forex spot and history for user's selected currency
   */
  const selectedCurrency = useAppSelector(state => selectSelectedCurrency(state))
  useEffect(() => {
    const symbol = selectedCurrency
    const timeframe = DEFAULT_HISTORY_TIMEFRAME
    const getFiatPriceHistory = marketApi.endpoints.findPriceHistoryByFiatSymbol.initiate
    const fetchForexRate = marketApi.endpoints.findByFiatSymbol.initiate
    dispatch(getFiatPriceHistory({ symbol, timeframe }))
    dispatch(fetchForexRate({ symbol }))
  }, [dispatch, selectedCurrency])

  // market data single-asset fetch, will use cached version if available
  // This uses the assetId from /assets route
  useEffect(() => {
    // early return for routes that don't contain an assetId, no need to refetch marketData granularly
    if (!routeAssetId) return

    dispatch(marketApi.endpoints.findByAssetId.initiate(routeAssetId))
  }, [dispatch, routeAssetId])

  // If the assets aren't loaded, then the app isn't ready to render
  // This fixes issues with refreshes on pages that expect assets to already exist
  return assetIds.length ? <>{children}</> : <></>
}
