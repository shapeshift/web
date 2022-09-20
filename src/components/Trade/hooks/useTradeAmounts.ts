import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import type { TradeAmountInputField, TS } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useTradeAmounts = () => {
  // Form hooks
  const { control, setValue, setError, clearErrors } = useFormContext<TS>()
  const buyAssetFiatRate = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetFiatRate = useWatch({ control, name: 'sellAssetFiatRate' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const fees = useWatch({ control, name: 'fees' })
  const formAmount = useWatch({ control, name: 'amount' })
  const formAction = useWatch({ control, name: 'action' })

  // Types
  type setTradeAmountsArgs = { amount?: string | null; action?: TradeAmountInputField }

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

  type ValidateAmountsArgs = {
    buyTradeAssetAmount: string
    sellTradeAssetAmount: string
  }

  const validateAmounts = useCallback(
    ({ buyTradeAssetAmount, sellTradeAssetAmount }: ValidateAmountsArgs) => {
      const sellAmountsDoesNotCoverFees =
        bnOrZero(buyTradeAssetAmount).isZero() && bnOrZero(sellTradeAssetAmount).isGreaterThan(0)
      sellAmountsDoesNotCoverFees
        ? setError('buyTradeAsset.amount', {
            type: 'manual',
            message: 'trade.errors.sellAmountDoesNotCoverFee',
          })
        : clearErrors('buyTradeAsset.amount')
    },
    [clearErrors, setError],
  )

  const setTradeAmounts = useCallback(
    ({ amount = formAmount, action = formAction }: setTradeAmountsArgs) => {
      const tradeFee = bnOrZero(fees?.tradeFee).div(bnOrZero(buyAssetFiatRate))
      if (sellAsset && buyAsset && amount && action) {
        const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount } =
          calculateAmounts({
            amount,
            action,
            buyAsset,
            sellAsset,
            buyAssetUsdRate: buyAssetFiatRate,
            sellAssetUsdRate: sellAssetFiatRate,
            selectedCurrencyToUsdRate,
            tradeFee,
          })
        const buyTradeAssetAmount = fromBaseUnit(cryptoBuyAmount, buyAsset.precision)
        const sellTradeAssetAmount = fromBaseUnit(cryptoSellAmount, sellAsset.precision)
        validateAmounts({ buyTradeAssetAmount, sellTradeAssetAmount })
        setValue('fiatSellAmount', fiatSellAmount)
        setValue('fiatBuyAmount', fiatBuyAmount)
        setValue('buyTradeAsset.amount', buyTradeAssetAmount)
        setValue('sellTradeAsset.amount', sellTradeAssetAmount)
      }
    },
    [
      buyAsset,
      buyAssetFiatRate,
      fees?.tradeFee,
      formAction,
      formAmount,
      selectedCurrencyToUsdRate,
      sellAsset,
      sellAssetFiatRate,
      setValue,
      validateAmounts,
    ],
  )

  return { setTradeAmounts }
}
