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
import { getDefaultAssetIdPairByChainId } from 'components/Trade/hooks/useSwapper/utils'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useSwapper } from '../useSwapper/useSwapperV2'

const moduleLogger = logger.child({ namespace: ['useTradeRoutes'] })

export enum AssetClickAction {
  Buy = 'buy',
  Sell = 'sell',
}

export const useTradeRoutes = (
  routeBuyAssetId?: AssetId,
): {
  handleAssetClick: (asset: Asset, action: AssetClickAction) => void
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const { swapperManager } = useSwapper()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const buyTradeAsset = getValues('buyTradeAsset')
  const sellTradeAsset = getValues('sellTradeAsset')
  const fiatSellAmount = getValues('fiatSellAmount')
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
  const [defaultSellAssetId, defaultBuyAssetId] = getDefaultAssetIdPairByChainId(
    buyAssetChainId,
    featureFlags,
  )

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
      if (
        routeDefaultSellAsset &&
        routeDefaultBuyAsset &&
        !(buyTradeAsset?.asset || sellTradeAsset?.asset)
      ) {
        setValue('buyTradeAsset.asset', routeDefaultBuyAsset)
        setValue('sellTradeAsset.asset', routeDefaultSellAsset)
        setValue('action', TradeAmountInputField.SELL_CRYPTO)
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

  const handleAssetClick = useCallback(
    (asset: Asset, action: AssetClickAction) => {
      const isBuy = action === AssetClickAction.Buy
      const isSell = action === AssetClickAction.Sell
      const isSameAsset =
        asset.assetId === (isBuy ? sellTradeAsset?.asset?.assetId : buyTradeAsset?.asset?.assetId)
      const previousSellTradeAsset = { ...getValues('sellTradeAsset') }
      const previousBuyTradeAsset = { ...getValues('buyTradeAsset') }

      if (isBuy) {
        setValue('buyTradeAsset.asset', asset)
        isSameAsset && setValue('sellTradeAsset.asset', previousBuyTradeAsset.asset)
      }

      if (isSell) {
        setValue('sellTradeAsset.asset', asset)
        isSameAsset && setValue('buyTradeAsset.asset', previousSellTradeAsset.asset)
        setValue('selectedAssetAccount', undefined)
        setValue('sellAssetAccount', undefined)
      }

      setValue('action', TradeAmountInputField.SELL_FIAT)
      setValue('amount', fiatSellAmount ?? '0')
      history.push(TradeRoutePaths.Input)
    },
    [
      sellTradeAsset?.asset?.assetId,
      buyTradeAsset?.asset?.assetId,
      getValues,
      setValue,
      fiatSellAmount,
      history,
    ],
  )

  return { handleAssetClick }
}
