import type { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { type TradeState, TradeAmountInputField } from 'components/Trade/types'
import { fromBaseUnit } from 'lib/math'
import { selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Trade Amount Service is responsible for reacting to changes to trade amounts and keeps all amounts in sync.
It mutates the fiatSellAmount, fiatBuyAmount, buyTradeAsset.amount, and sellTradeAsset.amount properties of TradeState.
*/
export const useTradeAmountService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const buyAssetFiatRate = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetFiatRate = useWatch({ control, name: 'sellAssetFiatRate' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const amount = useWatch({ control, name: 'amount' })
  const action = useWatch({ control, name: 'action' })

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

  // Get and set trade amounts
  useEffect(() => {
    if (sellAsset && buyAsset && amount) {
      ;(async () => {
        const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount } =
          calculateAmounts({
            amount,
            buyAsset,
            sellAsset,
            buyAssetUsdRate: buyAssetFiatRate,
            sellAssetUsdRate: sellAssetFiatRate,
            action: action ?? TradeAmountInputField.SELL_CRYPTO,
            selectedCurrencyToUsdRate,
          })
        setValue('fiatSellAmount', fiatSellAmount)
        setValue('fiatBuyAmount', fiatBuyAmount)
        setValue('buyTradeAsset.amount', fromBaseUnit(cryptoBuyAmount, buyAsset.precision))
        setValue('sellTradeAsset.amount', fromBaseUnit(cryptoSellAmount, sellAsset.precision))
      })()
    }
  }, [
    action,
    amount,
    buyAsset,
    buyAssetFiatRate,
    selectedCurrencyToUsdRate,
    sellAsset,
    sellAssetFiatRate,
    setValue,
  ])
}
