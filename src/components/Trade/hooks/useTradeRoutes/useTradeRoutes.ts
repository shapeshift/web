import { AssetId, chainIdToFeeAssetId } from '@shapeshiftoss/caip'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
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
  const feeAssetId = chainIdToFeeAssetId(sellTradeAsset?.asset?.chainId ?? 'eip155:1')
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const assets = useSelector(selectAssets)

  const setDefaultAssets = useCallback(async () => {
    // wait for assets to be loaded
    if (isEmpty(assets) || !feeAsset) return

    try {
      const [defaultSellAssetId, defaultBuyAssetId] = getDefaultPair()
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
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [assets, feeAsset, getDefaultPair, routeBuyAssetId, setValue, swapperManager, updateQuote])

  useEffect(() => {
    setDefaultAssets()
  }, [assets, routeBuyAssetId]) // eslint-disable-line react-hooks/exhaustive-deps

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
          await updateQuote({
            forceQuote: true,
            amount: bnOrZero(sellTradeAsset.amount).toString(),
            sellAsset: asset,
            buyAsset: buyTradeAsset.asset,
            feeAsset,
            action: TradeAmountInputField.SELL,
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
      sellTradeAsset?.asset,
      sellTradeAsset?.amount,
      buyTradeAsset?.asset,
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
          await updateQuote({
            forceQuote: true,
            amount: bnOrZero(buyTradeAsset.amount).toString(),
            sellAsset: sellTradeAsset.asset,
            buyAsset: asset,
            feeAsset,
            action: TradeAmountInputField.SELL,
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
