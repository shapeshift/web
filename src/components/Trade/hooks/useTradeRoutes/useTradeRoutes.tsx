import type { Asset } from '@keepkey/asset-service'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useTradeAmounts } from 'components/Trade/hooks/useTradeAmounts'
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
  const { setTradeAmountsRefetchData } = useTradeAmounts()
  const buyTradeAsset = getValues('buyTradeAsset')
  const sellTradeAsset = getValues('sellTradeAsset')

  const handleAssetClick = useCallback(
    async (asset: Asset, action: AssetClickAction) => {
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
      setValue('amount', '0')
      setValue('sellTradeAsset.amount', '0')
      setValue('buyTradeAsset.amount', '0')
      setValue('fiatBuyAmount', '0')
      setValue('fiatSellAmount', '0')
      setValue('quote', undefined)
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
    [
      sellTradeAsset?.asset?.assetId,
      buyTradeAsset?.asset?.assetId,
      getValues,
      setValue,
      setTradeAmountsRefetchData,
      history,
    ],
  )

  return { handleAssetClick }
}
