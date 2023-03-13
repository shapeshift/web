import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
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
  const { dispatch: swapperDispatch } = useSwapperState()

  const updateSelectedSellAssetAccountId = useSwapperStore(
    state => state.updateSelectedSellAssetAccountId,
  )
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const updateBuyAssetAccountId = useSwapperStore(state => state.updateBuyAssetAccountId)
  const updateQuote = useSwapperStore(state => state.updateQuote)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const sellTradeAsset = useSwapperStore(state => state.sellTradeAsset)
  const buyTradeAsset = useSwapperStore(state => state.buyTradeAsset)
  const updateBuyTradeAsset = useSwapperStore(state => state.updateBuyTradeAsset)
  const updateSellTradeAsset = useSwapperStore(state => state.updateSellTradeAsset)
  const clearAmounts = useSwapperStore(state => state.clearAmounts)
  const updateAction = useSwapperStore(state => state.updateAction)
  const updateIsSendMax = useSwapperStore(state => state.updateIsSendMax)
  const updateAmount = useSwapperStore(state => state.updateAmount)

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
        swapperDispatch({
          type: SwapperActionType.SET_VALUES,
          payload: {
            fees: undefined,
          },
        })
      }

      updateAction(TradeAmountInputField.SELL_FIAT)
      updateIsSendMax(false)
      updateAmount('0')
      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          trade: undefined,
        },
      })
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
      swapperDispatch,
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
    ],
  )

  return { handleAssetClick }
}
