import { Asset } from '@shapeshiftoss/asset-service'
import {
  AssetId,
  cosmosChainId,
  ethChainId,
  fromAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { supportsCosmos, supportsETH, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useSwapper } from '../useSwapper/useSwapper'
const moduleLogger = logger.child({ namespace: ['useTradeRoutes'] })

export const useTradeRoutes = (
  routeBuyAssetId?: AssetId,
): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const { getDefaultPair, swapperManager } = useSwapper()
  const buyTradeAsset = getValues('buyAsset')
  const sellTradeAsset = getValues('sellAsset')
  const assets = useSelector(selectAssets)
  const {
    state: { wallet },
  } = useWallet()

  const { connectedEvmChainId } = useEvm()

  // If the wallet is connected to a chain, use that ChainId
  // Else, return a prioritized ChainId based on the wallet's supported chains
  const walletChainId = useMemo(() => {
    if (connectedEvmChainId) return connectedEvmChainId
    if (!wallet) return
    if (supportsETH(wallet)) return ethChainId
    if (supportsCosmos(wallet)) return cosmosChainId
    if (supportsOsmosis(wallet)) return osmosisChainId
  }, [connectedEvmChainId, wallet])

  // Use the ChainId of the route's AssetId if we have one, else use the wallet's fallback ChainId
  const buyAssetChainId = routeBuyAssetId ? fromAssetId(routeBuyAssetId).chainId : walletChainId
  const [defaultSellAssetId, defaultBuyAssetId] = getDefaultPair(buyAssetChainId)

  const { chainId: defaultSellChainId } = fromAssetId(defaultSellAssetId)
  const defaultFeeAssetId = getChainAdapterManager().get(defaultSellChainId)!.getFeeAssetId()
  const defaultFeeAsset = useAppSelector(state => selectAssetById(state, defaultFeeAssetId))

  const setDefaultAssets = useCallback(async () => {
    const bestSwapper = await swapperManager.getBestSwapper({
      sellAssetId: defaultSellAssetId,
      buyAssetId: defaultBuyAssetId,
    })
    // wait for assets to be loaded and swappers to be initialized
    if (isEmpty(assets) || !defaultFeeAsset || !bestSwapper) return
    try {
      const routeDefaultSellAsset = assets[defaultSellAssetId]

      const preBuyAssetToCheckId = routeBuyAssetId ?? defaultBuyAssetId

      // make sure the same buy and sell assets arent selected
      const buyAssetToCheckId =
        preBuyAssetToCheckId === defaultSellAssetId ? defaultBuyAssetId : preBuyAssetToCheckId

      const bestSwapper = await swapperManager.getBestSwapper({
        buyAssetId: buyAssetToCheckId,
        sellAssetId: defaultSellAssetId,
      })

      // TODO update swapper to have an official way to validate a pair is supported.
      // This works for now
      const isSupportedPair = await (async () => {
        try {
          if (bestSwapper) {
            await bestSwapper.getUsdRate({ ...assets[buyAssetToCheckId] })
            return true
          }
        } catch (e) {}
        return false
      })()

      const buyAssetId = isSupportedPair ? buyAssetToCheckId : defaultBuyAssetId

      const routeDefaultBuyAsset = assets[buyAssetId]

      // If we don't have a quote already, get one for the route's default assets
      if (routeDefaultSellAsset && routeDefaultBuyAsset && !(buyTradeAsset || sellTradeAsset)) {
        setValue('buyAsset.asset', routeDefaultBuyAsset)
        setValue('sellAsset.asset', routeDefaultSellAsset)
        setValue('action', TradeAmountInputField.SELL)
        setValue('amount', '0')
      }
    } catch (e) {
      moduleLogger.warn(e, 'useTradeRoutes:setDefaultAssets error')
    }
  }, [
    assets,
    buyTradeAsset,
    defaultBuyAssetId,
    defaultFeeAsset,
    defaultSellAssetId,
    routeBuyAssetId,
    sellTradeAsset,
    setValue,
    swapperManager,
  ])

  useEffect(() => {
    if (!buyTradeAsset?.amount || !sellTradeAsset?.amount) {
      setDefaultAssets()
    }
  }, [
    assets,
    routeBuyAssetId,
    wallet,
    swapperManager,
    defaultFeeAsset,
    setDefaultAssets,
    buyTradeAsset,
    sellTradeAsset,
  ])

  useEffect(() => {
    setDefaultAssets()
  }, [connectedEvmChainId, setDefaultAssets])

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        const previousSellAsset = { ...getValues('sellAsset') }
        const previousBuyAsset = { ...getValues('buyAsset') }

        // Handle scenario where same asset is selected for buy and sell
        if (asset.assetId === previousBuyAsset?.asset?.assetId) {
          setValue('sellAsset.asset', asset)
          setValue('buyAsset.asset', previousSellAsset.asset)
        } else {
          setValue('sellAsset.asset', asset)
          setValue('buyAsset.asset', buyTradeAsset?.asset)
        }
        if (sellTradeAsset?.asset && buyTradeAsset?.asset) {
          const fiatSellAmount = getValues('fiatSellAmount') ?? '0'
          setValue('action', TradeAmountInputField.FIAT)
          setValue('amount', fiatSellAmount)
          setValue('selectedAssetAccount', undefined)
          setValue('sellAssetAccount', undefined)
        }
      } catch (e) {
        moduleLogger.warn(e, 'useTradeRoutes:handleSellClick error')
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [getValues, sellTradeAsset, buyTradeAsset, setValue, history],
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        const previousSellAsset = { ...getValues('sellAsset') }
        const previousBuyAsset = { ...getValues('buyAsset') }

        // Handle scenario where same asset is selected for buy and sell
        if (asset.assetId === previousSellAsset?.asset?.assetId) {
          setValue('buyAsset.asset', asset)
          setValue('sellAsset.asset', previousBuyAsset.asset)
        } else {
          setValue('buyAsset.asset', asset)
          setValue('sellAsset.asset', sellTradeAsset?.asset)
        }

        if (sellTradeAsset?.asset && buyTradeAsset?.asset) {
          const fiatSellAmount = getValues('fiatSellAmount') ?? '0'
          setValue('action', TradeAmountInputField.FIAT)
          setValue('amount', fiatSellAmount)
        }
      } catch (e) {
        moduleLogger.warn(e, 'useTradeRoutes:handleBuyClick error')
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [getValues, buyTradeAsset, sellTradeAsset, setValue, history],
  )

  return { handleSellClick, handleBuyClick }
}
