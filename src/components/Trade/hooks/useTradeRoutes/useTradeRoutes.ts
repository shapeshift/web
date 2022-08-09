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
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById, selectAssets, selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useSwapper } from '../useSwapper/useSwapper'

export const useTradeRoutes = (
  routeBuyAssetId?: AssetId,
): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const { updateQuote, getDefaultPair, swapperManager } = useSwapper()
  const buyTradeAsset = getValues('buyAsset')
  const sellTradeAsset = getValues('sellAsset')
  const feeAssetId = getChainAdapterManager()
    .get(sellTradeAsset?.asset ? sellTradeAsset.asset.chainId : ethChainId)! // ! operator as Map.prototype.get() is typed as get(key: K): V | undefined;
    .getFeeAssetId()
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const assets = useSelector(selectAssets)
  const {
    state: { wallet },
  } = useWallet()

  const { connectedEvmChainId } = useEvm()

  // If the wallet is connected to a chain, use that ChainId
  // Else, return a prioritized ChainId based on the wallet's supported chains
  const walletChainId = (() => {
    if (connectedEvmChainId) return connectedEvmChainId
    if (!wallet) return
    if (supportsETH(wallet)) return ethChainId
    if (supportsCosmos(wallet)) return cosmosChainId
    if (supportsOsmosis(wallet)) return osmosisChainId
  })()

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
      const sellAsset = assets[defaultSellAssetId]

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

      const buyAsset = assets[buyAssetId]

      if (sellAsset && buyAsset && (!buyTradeAsset?.amount || !sellTradeAsset?.amount)) {
        setValue('buyAsset.asset', buyAsset)
        setValue('sellAsset.asset', sellAsset)
        await updateQuote({
          forceQuote: true,
          amount: '0',
          sellAsset,
          buyAsset,
          feeAsset: defaultFeeAsset,
          action: TradeAmountInputField.SELL,
          selectedCurrencyToUsdRate,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [
    assets,
    buyTradeAsset?.amount,
    defaultBuyAssetId,
    defaultFeeAsset,
    defaultSellAssetId,
    routeBuyAssetId,
    selectedCurrencyToUsdRate,
    sellTradeAsset?.amount,
    setValue,
    swapperManager,
    updateQuote,
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
          await updateQuote({
            forceQuote: true,
            amount: fiatSellAmount,
            sellAsset: asset,
            buyAsset: buyTradeAsset.asset,
            feeAsset,
            action: TradeAmountInputField.FIAT,
            selectedCurrencyToUsdRate,
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [
      getValues,
      sellTradeAsset,
      buyTradeAsset,
      selectedCurrencyToUsdRate,
      setValue,
      updateQuote,
      feeAsset,
      history,
    ],
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
          await updateQuote({
            forceQuote: true,
            amount: fiatSellAmount,
            sellAsset: sellTradeAsset.asset,
            buyAsset: asset,
            feeAsset,
            action: TradeAmountInputField.FIAT,
            selectedCurrencyToUsdRate,
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [
      getValues,
      buyTradeAsset,
      sellTradeAsset,
      updateQuote,
      selectedCurrencyToUsdRate,
      feeAsset,
      setValue,
      history,
    ],
  )

  return { handleSellClick, handleBuyClick }
}
