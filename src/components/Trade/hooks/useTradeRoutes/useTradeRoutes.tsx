import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeRoutePaths } from 'components/Trade/types'
import { selectBuyAsset, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export enum AssetClickAction {
  Buy = 'buy',
  Sell = 'sell',
}

export const useTradeRoutes = (): {
  handleAssetClick: (asset: Asset, action: AssetClickAction) => void
} => {
  const history = useHistory()

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
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const updateBuyAsset = useSwapperStore(state => state.updateBuyAsset)
  const updateSellAsset = useSwapperStore(state => state.updateSellAsset)
  const updateSellAmountCryptoPrecision = useSwapperStore(
    state => state.updateSellAmountCryptoPrecision,
  )
  const updateBuyAmountCryptoPrecision = useSwapperStore(
    state => state.updateBuyAmountCryptoPrecision,
  )
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateAmount = useSwapperStore(state => state.updateAmount)

  const handleAssetClick = useCallback(
    (asset: Asset, action: AssetClickAction) => {
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

      updateAction(TradeAmountInputField.SELL_FIAT)
      updateAmount('0')

      clearAmounts()
      history.push(TradeRoutePaths.Input)
    },
    [
      sellAsset,
      buyAsset,
      updateAction,
      updateAmount,
      clearAmounts,
      history,
      updateBuyAsset,
      updateSellAsset,
      updateBuyAmountCryptoPrecision,
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
