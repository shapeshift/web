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
  const {
    dispatch: swapperDispatch,
    state: { buyTradeAsset, sellTradeAsset },
  } = useSwapperState()

  const updateSelectedSellAssetAccountId = useSwapperStore(
    state => state.updateSelectedSellAssetAccountId,
  )
  const updateSelectedBuyAssetAccountId = useSwapperStore(
    state => state.updateSelectedBuyAssetAccountId,
  )
  const updateBuyAssetAccountId = useSwapperStore(state => state.updateBuyAssetAccountId)
  const updateQuote = useSwapperStore(state => state.updateQuote)

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
        updateSelectedBuyAssetAccountId(undefined)
        updateBuyAssetAccountId(undefined)
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
        updateSelectedSellAssetAccountId(undefined)
        swapperDispatch({
          type: SwapperActionType.SET_VALUES,
          payload: {
            fiatBuyAmount: '0',
            fiatSellAmount: '0',
            sellAssetFiatRate: undefined,
            buyAssetFiatRate: undefined,
            feeAssetFiatRate: undefined,
          },
        })
      }

      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          trade: undefined,
          action: TradeAmountInputField.SELL_FIAT,
          isSendMax: false,
          amount: '0',
        },
      })
      updateQuote(undefined)
      swapperDispatch({ type: SwapperActionType.CLEAR_AMOUNTS })

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
      swapperDispatch,
      updateQuote,
      history,
      setTradeAmountsRefetchData,
      updateSelectedBuyAssetAccountId,
      updateBuyAssetAccountId,
      updateSelectedSellAssetAccountId,
    ],
  )

  return { handleAssetClick }
}
