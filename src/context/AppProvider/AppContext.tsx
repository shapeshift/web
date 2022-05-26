import { ASSET_REFERENCE, cosmosChainId, toAssetId, toChainId } from '@shapeshiftoss/caip'
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
import difference from 'lodash/difference'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import React, { useCallback, useEffect, useState } from 'react'
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
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectSelectedCurrency,
  selectTxHistoryStatus,
  selectTxIds,
  selectTxs,
} from 'state/slices/selectors'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { deserializeUniqueTxId } from 'state/slices/txHistorySlice/utils'
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
  const routeAssetId = useRouteAssetId()

  // keep track of pending tx ids, so we can refetch the portfolio when they confirm
  const [pendingTxIds, setPendingTxIds] = useState<Set<TxId>>(new Set<TxId>())

  // immediately load all assets, before the wallet is even connected,
  // so the app is functional and ready
  useGetAssetsQuery()

  // load top 1000 assets market data
  // this is needed to sort assets by market cap
  // and covers most assets users will have
  useFindAllQuery()
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

  // once the wallet is connected, reach out to unchained to fetch
  // accounts for each chain/account specifier combination
  useEffect(() => {
    const { getAccount } = portfolioApi.endpoints
    // forceRefetch is enabled here to make sure that we always have the latest wallet information
    // it also forces queryFn to run and that's needed for the wallet info to be dispatched
    const options = { forceRefetch: true }
    // fetch each account
    accountSpecifiersList.forEach(accountSpecifierMap =>
      dispatch(getAccount.initiate({ accountSpecifierMap }, options)),
    )
  }, [dispatch, accountSpecifiersList])

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

  const txIds = useSelector(selectTxIds)
  const txsById = useSelector(selectTxs)
  const txHistoryStatus = useSelector(selectTxHistoryStatus)

  /**
   * refetch an account given a newly confirmed txid
   */
  const refetchAccountByTxId = useCallback(
    (txId: TxId) => {
      // the accountSpecifier the tx came from
      const { txAccountSpecifier } = deserializeUniqueTxId(txId)
      // only refetch the specific account for this tx
      const accountSpecifierMap = accountSpecifiersList.reduce((acc, cur) => {
        const [chainId, accountSpecifier] = Object.entries(cur)[0]
        const accountId = `${chainId}:${accountSpecifier}`
        if (accountId === txAccountSpecifier) acc[chainId] = accountSpecifier
        return acc
      }, {})
      const { getAccount } = portfolioApi.endpoints
      dispatch(getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true }))
    },
    [accountSpecifiersList, dispatch],
  )

  const portfolioAccounts = useAppSelector(state => selectPortfolioAccounts(state))

  /**
   * monitor for new pending txs, add them to a set, so we can monitor when they're confirmed
   */
  useEffect(() => {
    // we only want to refetch portfolio if a new tx comes in after we're finished loading
    if (txHistoryStatus !== 'loaded') return
    // don't fire with nothing connected
    if (isEmpty(accountSpecifiers)) return
    // grab the most recent txId
    const txId = head(txIds)!
    // grab the actual tx
    const tx = txsById[txId]
    // always wear protection, or don't it's your choice really
    if (!tx) return

    if (tx.chainId === cosmosChainId) {
      // This block refetches validator data on subsequent Txs in case TVL or APR changed.
      const validators = portfolioAccounts[`${cosmosChainId}:${tx.address}`]?.validatorIds
      validators?.forEach(validatorAddress => {
        dispatch(
          validatorDataApi.endpoints.getValidatorData.initiate({
            validatorAddress,
          }),
        )
      })
      // cosmos txs only come in when they're confirmed, so refetch that account immediately
      return refetchAccountByTxId(txId)
    } else {
      /**
       * the unchained getAccount call does not include pending txs in the portfolio
       * add them to a set, and the two effects below monitor the set of pending txs
       */
      if (tx.status === 'pending') setPendingTxIds(new Set([...pendingTxIds, txId]))
    }

    // txsById changes on each tx - as txs have more confirmations
    // pendingTxIds is changed by this effect, so don't create an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txIds, txHistoryStatus, refetchAccountByTxId])

  /**
   * monitor the pending tx ids for when they change to confirmed.
   * when they do change to confirmed, refetch the portfolio for that chain
   * (unchained does not include assets for pending txs)
   */
  useEffect(() => {
    // don't monitor any of this stuff if we're still loading - txsByIds will be thrashing
    if (txHistoryStatus !== 'loaded') return
    if (!pendingTxIds.size) return
    // can't map a set, spread it first
    const confirmedTxIds = [...pendingTxIds].filter(txId => txsById[txId]?.status === 'confirmed')
    // txsById will change often, but we only care that if they've gone from pending -> confirmed
    if (!confirmedTxIds.length) return
    // refetch the account for each newly confirmed tx
    confirmedTxIds.forEach(txId => refetchAccountByTxId(txId))
    // stop monitoring the pending tx ids that have now been confirmed
    setPendingTxIds(new Set([...difference([...pendingTxIds], confirmedTxIds)]))
  }, [pendingTxIds, refetchAccountByTxId, txsById, txHistoryStatus])

  // we only prefetch market data for the top 1000 assets
  // once the portfolio has loaded, check we have market data
  // for more obscure assets, if we don't have it, fetch it
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)

  // market data pre and refetch management
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
