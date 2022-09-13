import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
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
  const { getValues, setValue } = useFormContext<TS>()
  const buyTradeAsset = getValues('buyTradeAsset')
  const sellTradeAsset = getValues('sellTradeAsset')
  const fiatSellAmount = getValues('fiatSellAmount')

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
        setValue('selectedBuyAssetAccountId', undefined)
        setValue('buyAssetAccountId', undefined)
      }

      if (isSell) {
        setValue('sellTradeAsset.asset', asset)
        isSameAsset && setValue('buyTradeAsset.asset', previousSellTradeAsset.asset)
        setValue('selectedSellAssetAccountId', undefined)
        setValue('sellAssetAccountId', undefined)
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
