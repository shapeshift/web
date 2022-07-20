import { AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
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
  const feeAssetId = getChainAdapters()
    .get(sellTradeAsset?.asset?.chainId ?? 'eip155:1')
    ?.getFeeAssetId() as AssetId
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const assets = useSelector(selectAssets)
  const {
    state: { wallet },
  } = useWallet()

  const [defaultSellAssetId, defaultBuyAssetId] = getDefaultPair()
  const { chainId: defaultSellChainId } = fromAssetId(defaultSellAssetId)
  const defaultFeeAssetId = getChainAdapters().get(defaultSellChainId)?.getFeeAssetId() as AssetId
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

      if (sellAsset && buyAsset) {
        setValue('buyAsset.asset', buyAsset)
        setValue('sellAsset.asset', sellAsset)
        await updateQuote({
          forceQuote: true,
          amount: '0',
          sellAsset,
          buyAsset,
          feeAsset: defaultFeeAsset,
          action: TradeAmountInputField.SELL,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [
    assets,
    defaultBuyAssetId,
    defaultFeeAsset,
    defaultSellAssetId,
    routeBuyAssetId,
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
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [getValues, sellTradeAsset, buyTradeAsset, setValue, updateQuote, feeAsset, history],
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
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [getValues, buyTradeAsset, sellTradeAsset, updateQuote, feeAsset, setValue, history],
  )

  return { handleSellClick, handleBuyClick }
}
