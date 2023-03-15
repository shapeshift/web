import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
import { TradeAmountInputField, TradeRoutePaths } from 'components/Trade/types'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export enum AssetClickAction {
  Buy = 'buy',
  Sell = 'sell',
}

export const useTradeRoutes = (): {
  handleAssetClick: (asset: Asset, action: AssetClickAction) => void
} => {
  const history = useHistory()
  const { setTradeAmountsRefetchData } = useTradeAmounts()

  const updateSelectedSellAssetAccountId = useSwapperStore(
    state => state.updateSelectedSellAssetAccountId,
  )
  const updateSellAssetAccountId = useSwapperStore(state => state.updateSellAssetAccountId)
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const updateFees = useSwapperStore(state => state.updateFees)
  const clearAmounts = useSwapperStore(state => state.clearAmounts)
  const updateBuyAssetAccountId = useSwapperStore(state => state.updateBuyAssetAccountId)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const buyAsset = useSwapperStore(state => state.buyAsset)
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const updateBuyAsset = useSwapperStore(state => state.updateBuyAsset)
  const updateSellAsset = useSwapperStore(state => state.updateSellAsset)
  const updateSellAmountCryptoPrecision = useSwapperStore(
    state => state.updateSellAmountCryptoPrecision,
  )
  const updateBuyAmountCryptoPrecision = useSwapperStore(
    state => state.updateBuyAmountCryptoPrecision,
  )

  const handleAssetClick = useCallback(
    async (asset: Asset, action: AssetClickAction) => {
      const isBuy = action === AssetClickAction.Buy
      const isSell = action === AssetClickAction.Sell
      const isSameAsset = asset.assetId === (isBuy ? sellAsset?.assetId : buyAsset?.assetId)
      const previousSellAsset = sellAsset
      const previousBuyAsset = buyAsset

      if (isBuy) {
        updateBuyAsset(asset)
        updateBuyAmountCryptoPrecision('')
        isSameAsset && updateSellAsset(previousBuyAsset)
        isSameAsset && updateSellAmountCryptoPrecision('')
        updateSelectedBuyAssetAccountId(undefined)
        updateBuyAssetAccountId(undefined)
      }

      if (isSell) {
        updateSellAsset(asset)
        updateSellAmountCryptoPrecision('')
        isSameAsset && updateBuyAsset(previousSellAsset)
        isSameAsset && updateBuyAmountCryptoPrecision('')
        updateSelectedSellAssetAccountId(undefined)
        updateSellAssetAccountId(undefined)
        updateBuyAssetFiatRate(undefined)
        updateSellAssetFiatRate(undefined)
        updateFeeAssetFiatRate(undefined)
        updateFees(undefined)
      }

      clearAmounts()
      history.push(TradeRoutePaths.Input)

      await setTradeAmountsRefetchData({
        sellAssetId: isSell ? asset.assetId : undefined,
        buyAssetId: isBuy ? asset.assetId : undefined,
        amount: '0',
        action: TradeAmountInputField.SELL_FIAT,
      })
    },
    [
      sellAsset,
      buyAsset,
      clearAmounts,
      history,
      setTradeAmountsRefetchData,
      updateBuyAsset,
      updateBuyAmountCryptoPrecision,
      updateSellAsset,
      updateSellAmountCryptoPrecision,
      updateSelectedBuyAssetAccountId,
      updateBuyAssetAccountId,
      updateSelectedSellAssetAccountId,
      updateSellAssetAccountId,
      updateBuyAssetFiatRate,
      updateSellAssetFiatRate,
      updateFeeAssetFiatRate,
      updateFees,
    ],
  )

  return { handleAssetClick }
}
