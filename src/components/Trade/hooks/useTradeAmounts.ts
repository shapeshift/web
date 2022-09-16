import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import type { TradeAmountInputField } from 'components/Trade/types'
import type { TS } from 'components/Trade/types'
import { fromBaseUnit } from 'lib/math'
import { selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useTradeAmounts = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const buyAssetFiatRate = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetFiatRate = useWatch({ control, name: 'sellAssetFiatRate' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  // Types
  type setTradeAmountsArgs = { amount: string | null; action: TradeAmountInputField }

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

  const setTradeAmounts = useCallback(
    ({ amount, action }: setTradeAmountsArgs) => {
      if (sellAsset && buyAsset && amount) {
        const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount } =
          calculateAmounts({
            amount,
            action,
            buyAsset,
            sellAsset,
            buyAssetUsdRate: buyAssetFiatRate,
            sellAssetUsdRate: sellAssetFiatRate,
            selectedCurrencyToUsdRate,
          })
        setValue('fiatSellAmount', fiatSellAmount)
        setValue('fiatBuyAmount', fiatBuyAmount)
        setValue('buyTradeAsset.amount', fromBaseUnit(cryptoBuyAmount, buyAsset.precision))
        setValue('sellTradeAsset.amount', fromBaseUnit(cryptoSellAmount, sellAsset.precision))
      }
    },
    [buyAsset, buyAssetFiatRate, selectedCurrencyToUsdRate, sellAsset, sellAssetFiatRate, setValue],
  )

  return { setTradeAmounts }
}
