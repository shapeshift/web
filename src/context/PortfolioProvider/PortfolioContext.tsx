import { AssetNamespace, AssetReference, caip2, caip19 } from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import {
  bip32ToAddressNList,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsOsmosis
} from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  AccountSpecifierMap,
  accountSpecifiers
} from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { supportedAccountTypes } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAccountSpecifiers,
  selectAssetIds,
  selectAssets,
  selectPortfolioAssetIds,
  selectTxHistoryStatus,
  selectTxIds,
  selectTxs
} from 'state/slices/selectors'
import { deserializeUniqueTxId } from 'state/slices/txHistorySlice/utils'

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
export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch()
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()
  const assetsById = useSelector(selectAssets)
  const assetIds = useSelector(selectAssetIds)

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
    if (isEmpty(accountSpecifiersList)) return
    // clear the old portfolio, we have different non null data, we're switching wallet
    console.info('dispatching portfolio clear action')
    dispatch(portfolio.actions.clear())
    // fetch each account
    accountSpecifiersList.forEach(accountSpecifierMap => {
      // forceRefetch is enabled here to make sure that we always have the latest wallet information
      // it also forces queryFn to run and that's needed for the wallet info to be dispatched
      dispatch(
        portfolioApi.endpoints.getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true })
      )
    })
  }, [dispatch, accountSpecifiersList])

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
    if (!wallet) return
    if (isEmpty(assetsById)) return
    ;(async () => {
      try {
        const supportedChains = chainAdapter.getSupportedChains()
        const acc: AccountSpecifierMap[] = []

        for (const chain of supportedChains) {
          const adapter = chainAdapter.byChain(chain)

          switch (chain) {
            // TODO: Handle Cosmos ChainType here
            case ChainTypes.Ethereum: {
              if (!supportsETH(wallet)) continue
              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.MAINNET })
              acc.push({ [CAIP2]: pubkey.toLowerCase() })
              break
            }
            case ChainTypes.Bitcoin: {
              if (!supportsBTC(wallet)) continue
              const CAIP19 = caip19.toCAIP19({
                chain,
                network: NetworkTypes.MAINNET,
                assetNamespace: AssetNamespace.Slip44,
                assetReference: AssetReference.Bitcoin
              })
              const bitcoin = assetsById[CAIP19]

              if (!bitcoin) continue
              for (const accountType of supportedAccountTypes.bitcoin) {
                const accountParams = utxoAccountParams(bitcoin, accountType, 0)
                const { bip44Params, scriptType } = accountParams
                const pubkeys = await wallet.getPublicKeys([
                  {
                    coin: adapter.getType(),
                    addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
                    curve: 'secp256k1',
                    scriptType
                  }
                ])
                if (!pubkeys?.[0]?.xpub) {
                  throw new Error(`usePubkeys: error getting bitcoin xpub`)
                }
                const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)

                if (!pubkey) continue
                const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.MAINNET })
                acc.push({ [CAIP2]: pubkey })
              }
              break
            }
            case ChainTypes.Cosmos: {
              if (!supportsCosmos(wallet)) continue
              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.COSMOSHUB_MAINNET })
              acc.push({ [CAIP2]: pubkey })
              break
            }
            case ChainTypes.Osmosis: {
              if (!supportsOsmosis(wallet)) continue
              const pubkey = await adapter.getAddress({ wallet })
              if (!pubkey) continue
              const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.OSMOSIS_MAINNET })
              acc.push({ [CAIP2]: pubkey })
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
  }, [assetsById, chainAdapter, dispatch, wallet])

  const txIds = useSelector(selectTxIds)
  const txsById = useSelector(selectTxs)
  const txHistoryStatus = useSelector(selectTxHistoryStatus)

  /**
   * portfolio refetch on new tx logic
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
    /**
     * TODO(0xdef1cafe): we need this effect to actually watch the whole txsById object
     *
     * the issue is we get a pending tx, but the unchained getAccount call does not
     * optimistically include pending txs, so we need to refetch when the tx is confirmed
     * add the additional logic here to do this. we should probably ignore pending txs
     * as refetching will cause charts to update slightly by the fee amount, but not
     * the actually amount that's related to the asset being sent or received
     */
    // the accountSpecifier the tx came from
    const { txAccountSpecifier } = deserializeUniqueTxId(txId)
    // only refetch accounts for this tx
    const accountSpecifierMap = accountSpecifiersList.reduce((acc, cur) => {
      const [chainId, accountSpecifier] = Object.entries(cur)[0]
      const accountId = chainId + ':' + accountSpecifier
      if (accountId === txAccountSpecifier) acc[chainId] = accountSpecifier
      return acc
    }, {})
    dispatch(
      portfolioApi.endpoints.getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true })
    )
    // txsById changes on each tx - as txs have more confirmations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, txIds])

  // we only prefetch market data for the top 1000 assets
  // once the portfolio has loaded, check we have market data
  // for more obscure assets, if we don't have it, fetch it
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)

  // creating a variable to store the intervals in
  const [marketDataIntervalId, setMarketDataIntervalId] = useState<NodeJS.Timer | undefined>()

  // market data pre and refetch management
  useEffect(() => {
    if (!portfolioAssetIds.length) return

    const fetchMarketData = () => {
      portfolioAssetIds.forEach(assetId => {
        dispatch(marketApi.endpoints.findByCaip19.initiate(assetId, { forceRefetch: true }))
      })
    }

    // do this the first time once
    fetchMarketData()

    // clear the old timer
    if (marketDataIntervalId) {
      clearInterval(marketDataIntervalId)
      setMarketDataIntervalId(undefined)
    }

    const MARKET_DATA_REFRESH_INTERVAL = 1000 * 60 * 2 // two minutes
    setMarketDataIntervalId(setInterval(fetchMarketData, MARKET_DATA_REFRESH_INTERVAL))

    // marketDataIntervalId causes infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioAssetIds, setMarketDataIntervalId, dispatch])

  // If the assets aren't loaded, then the app isn't ready to render
  // This fixes issues with refreshes on pages that expect assets to already exist
  return assetIds.length ? <>{children}</> : <></>
}
