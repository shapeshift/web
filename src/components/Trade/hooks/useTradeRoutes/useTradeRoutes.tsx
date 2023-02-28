import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'
import type { TS } from 'components/Trade/types'
import { TradeAmountInputField, TradeRoutePaths } from 'components/Trade/types'

export enum AssetClickAction {
  Buy = 'buy',
  Sell = 'sell',
}

export const useTradeRoutes = (): {
  handleAssetClick: (asset: Asset, action: AssetClickAction) => void
} => {
  const history = useHistory()
  const { setValue } = useFormContext<TS>()
  const { setTradeAmountsRefetchData } = useTradeAmounts()
  const { dispatch: swapperDispatch, buyTradeAsset, sellTradeAsset } = useSwapperState()

  const handleAssetClick = useCallback(
    async (asset: Asset, action: AssetClickAction) => {
      const isBuy = action === AssetClickAction.Buy
      const isSell = action === AssetClickAction.Sell
      const isSameAsset =
        asset.assetId === (isBuy ? sellTradeAsset?.asset?.assetId : buyTradeAsset?.asset?.assetId)
      const previousSellTradeAsset = sellTradeAsset
      const previousBuyTradeAsset = buyTradeAsset

      if (isBuy) {
        swapperDispatch({
          type: SwapperActionType.SET_BUY_ASSET,
          payload: asset,
        })
        isSameAsset &&
          swapperDispatch({
            type: SwapperActionType.SET_SELL_ASSET,
            payload: previousBuyTradeAsset?.asset,
          })
        setValue('selectedBuyAssetAccountId', undefined)
        setValue('buyAssetAccountId', undefined)
      }

      if (isSell) {
        swapperDispatch({
          type: SwapperActionType.SET_SELL_ASSET,
          payload: asset,
        })
        isSameAsset &&
          swapperDispatch({
            type: SwapperActionType.SET_BUY_ASSET,
            payload: previousSellTradeAsset?.asset,
          })
        setValue('selectedSellAssetAccountId', undefined)
        setValue('sellAssetAccountId', undefined)
      }

      setValue('action', TradeAmountInputField.SELL_FIAT)
      setValue('amount', '0')
      setValue('fiatBuyAmount', '0')
      setValue('fiatSellAmount', '0')
      swapperDispatch({ type: SwapperActionType.SET_QUOTE, payload: undefined })
      swapperDispatch({ type: SwapperActionType.CLEAR_AMOUNTS })
      setValue('trade', undefined)
      setValue('sellAssetFiatRate', undefined)
      setValue('buyAssetFiatRate', undefined)
      setValue('feeAssetFiatRate', undefined)
      setValue('isSendMax', false)

      history.push(TradeRoutePaths.Input)

      await setTradeAmountsRefetchData({
        sellAssetId: isSell ? asset.assetId : undefined,
        buyAssetId: isBuy ? asset.assetId : undefined,
        amount: '0',
        action: TradeAmountInputField.SELL_FIAT,
      })
    },
    [sellTradeAsset, buyTradeAsset, setValue, swapperDispatch, history, setTradeAmountsRefetchData],
  )

  return { handleAssetClick }
}
