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
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const updateFees = useSwapperStore(state => state.updateFees)
  const updateQuote = useSwapperStore(state => state.updateQuote)
  const updateTrade = useSwapperStore(state => state.updateTrade)
  const clearAmounts = useSwapperStore(state => state.clearAmounts)
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateAmount = useSwapperStore(state => state.updateAmount)
  const buyTradeAsset = useSwapperStore(state => state.buyTradeAsset)
  const sellTradeAsset = useSwapperStore(state => state.sellTradeAsset)
  const updateIsSendMax = useSwapperStore(state => state.updateIsSendMax)
  const updateBuyTradeAsset = useSwapperStore(state => state.updateBuyTradeAsset)
  const updateSellTradeAsset = useSwapperStore(state => state.updateSellTradeAsset)
  const updateBuyAssetAccountId = useSwapperStore(state => state.updateBuyAssetAccountId)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)

  const handleAssetClick = useCallback(
    async (asset: Asset, action: AssetClickAction) => {
      const isBuy = action === AssetClickAction.Buy
      const isSell = action === AssetClickAction.Sell
      const isSameAsset =
        asset.assetId === (isBuy ? sellTradeAsset?.asset?.assetId : buyTradeAsset?.asset?.assetId)
      const previousSellTradeAsset = sellTradeAsset
      const previousBuyTradeAsset = buyTradeAsset

      if (isBuy) {
        updateBuyTradeAsset({
          asset,
          amountCryptoPrecision: '',
        })
        isSameAsset &&
          updateSellTradeAsset({
            asset: previousBuyTradeAsset?.asset,
            amountCryptoPrecision: '',
          })
        updateSelectedBuyAssetAccountId(undefined)
        updateBuyAssetAccountId(undefined)
      }

      if (isSell) {
        updateSellTradeAsset({
          asset,
        })
        isSameAsset &&
          updateBuyTradeAsset({
            asset: previousSellTradeAsset?.asset,
            amountCryptoPrecision: '',
          })
        updateSelectedSellAssetAccountId(undefined)
        updateBuyAssetFiatRate(undefined)
        updateSellAssetFiatRate(undefined)
        updateFeeAssetFiatRate(undefined)
        updateFees(undefined)
      }

      updateAction(TradeAmountInputField.SELL_FIAT)
      updateIsSendMax(false)
      updateAmount('0')
      updateTrade(undefined)
      updateQuote(undefined)
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
      sellTradeAsset,
      buyTradeAsset,
      updateAction,
      updateIsSendMax,
      updateAmount,
      updateTrade,
      updateQuote,
      clearAmounts,
      history,
      setTradeAmountsRefetchData,
      updateBuyTradeAsset,
      updateSellTradeAsset,
      updateSelectedBuyAssetAccountId,
      updateBuyAssetAccountId,
      updateSelectedSellAssetAccountId,
      updateBuyAssetFiatRate,
      updateSellAssetFiatRate,
      updateFeeAssetFiatRate,
      updateFees,
    ],
  )

  return { handleAssetClick }
}
