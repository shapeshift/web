import { useFormContext, useWatch } from 'react-hook-form'
import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import type { TS } from 'components/Trade/types'
import { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { selectFiatToUsdRate } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type GetTradeAmountConstantsArgs = CalculateAmountsArgs

export const getTradeAmountConstants = ({
  amount,
  buyAsset,
  sellAsset,
  buyAssetUsdRate,
  sellAssetUsdRate,
  selectedCurrencyToUsdRate,
  sellAssetTradeFeeUsd,
  buyAssetTradeFeeUsd,
  action,
}: GetTradeAmountConstantsArgs) => {
  const assetPriceRatio = bnOrZero(buyAssetUsdRate).dividedBy(sellAssetUsdRate)
  const usdAmount = bnOrZero(amount).dividedBy(selectedCurrencyToUsdRate)

  const sellAmountBeforeFeesBaseUnit: string = (() => {
    switch (action) {
      case TradeAmountInputField.BUY_CRYPTO:
        return toBaseUnit(bnOrZero(amount).times(assetPriceRatio), sellAsset.precision)
      case TradeAmountInputField.SELL_CRYPTO:
        return toBaseUnit(amount, sellAsset.precision)
      case TradeAmountInputField.BUY_FIAT:
      case TradeAmountInputField.SELL_FIAT:
        return toBaseUnit(usdAmount.dividedBy(sellAssetUsdRate), sellAsset.precision)
      default:
        return '0'
    }
  })()

  const buyAmountBeforeFeesBaseUnit: string = (() => {
    switch (action) {
      case TradeAmountInputField.BUY_CRYPTO:
        return toBaseUnit(amount, buyAsset.precision)
      case TradeAmountInputField.SELL_CRYPTO:
        return toBaseUnit(bnOrZero(amount).div(assetPriceRatio), buyAsset.precision)
      case TradeAmountInputField.BUY_FIAT:
      case TradeAmountInputField.SELL_FIAT:
        return toBaseUnit(usdAmount.dividedBy(buyAssetUsdRate), buyAsset.precision)
      default:
        return '0'
    }
  })()

  const sellAmountBeforeFeesBuyAsset: string = bnOrZero(
    fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAsset.precision),
  )
    .div(assetPriceRatio)
    .toString()

  const buyAmountBeforeFees = fromBaseUnit(buyAmountBeforeFeesBaseUnit, buyAsset.precision)

  const sellAssetTradeFeeSellAssetBaseUnit = toBaseUnit(
    sellAssetTradeFeeUsd.div(sellAssetUsdRate),
    sellAsset.precision,
  )

  const buyAssetTradeFeeBuyAssetBaseUnit = toBaseUnit(
    buyAssetTradeFeeUsd.div(buyAssetUsdRate),
    buyAsset.precision,
  )

  const sellAssetTradeFeeBuyAssetBaseUnit = toBaseUnit(
    fromBaseUnit(
      bnOrZero(sellAssetTradeFeeSellAssetBaseUnit).div(assetPriceRatio),
      sellAsset.precision,
    ),
    buyAsset.precision,
  )

  const buyAssetTradeFeeSellAssetBaseUnit = toBaseUnit(
    fromBaseUnit(
      bnOrZero(buyAssetTradeFeeBuyAssetBaseUnit).times(assetPriceRatio),
      buyAsset.precision,
    ),
    sellAsset.precision,
  )

  // The total fees in the sell asset base unit
  const totalTradeFeeSellAssetBaseUnit = bnOrZero(buyAssetTradeFeeSellAssetBaseUnit).plus(
    sellAssetTradeFeeSellAssetBaseUnit,
  )

  // The total fees in the buy asset base unit
  const totalTradeFeeBuyAssetBaseUnit = bnOrZero(buyAssetTradeFeeBuyAssetBaseUnit)
    .plus(sellAssetTradeFeeBuyAssetBaseUnit)
    .toString()

  const totalTradeFeeBuyAsset = fromBaseUnit(totalTradeFeeBuyAssetBaseUnit, buyAsset.precision)

  const sellAmountPlusFeesBaseUnit = bnOrZero(sellAmountBeforeFeesBaseUnit)
    .plus(totalTradeFeeSellAssetBaseUnit)
    .toString()

  const buyAmountBeforeFeesFiat = bnOrZero(
    fromBaseUnit(buyAmountBeforeFeesBaseUnit, buyAsset.precision),
  )
    .times(buyAssetUsdRate)
    .times(selectedCurrencyToUsdRate)
    .toFixed(2)

  const sellAmountBeforeFeesFiat = bnOrZero(
    fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAsset.precision),
  )
    .times(sellAssetUsdRate)
    .times(selectedCurrencyToUsdRate)
    .toFixed(2)

  const sellAmountPlusFeesFiat = bnOrZero(
    fromBaseUnit(sellAmountPlusFeesBaseUnit, sellAsset.precision),
  )
    .times(sellAssetUsdRate)
    .times(selectedCurrencyToUsdRate)
    .toFixed(2)

  const sellAmountBeforeFeesBuyAssetBaseUnit = toBaseUnit(
    sellAmountBeforeFeesBuyAsset,
    buyAsset.precision,
  )

  const buyAmountAfterFeesBaseUnit = bnOrZero(sellAmountBeforeFeesBuyAssetBaseUnit)
    .minus(totalTradeFeeBuyAssetBaseUnit)
    .toString()

  const buyAmountAfterFees = fromBaseUnit(buyAmountAfterFeesBaseUnit, buyAsset.precision)

  const buyAmountAfterFeesFiat = bnOrZero(
    fromBaseUnit(buyAmountAfterFeesBaseUnit, buyAsset.precision),
  )
    .times(buyAssetUsdRate)
    .times(selectedCurrencyToUsdRate)
    .toFixed(2)

  const beforeFeesBuyAsset: string = (() => {
    switch (action) {
      case TradeAmountInputField.SELL_CRYPTO:
        return bnOrZero(amount).div(assetPriceRatio).toString()
      case TradeAmountInputField.SELL_FIAT:
        return bnOrZero(fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAsset.precision))
          .div(assetPriceRatio)
          .toString()
      case TradeAmountInputField.BUY_CRYPTO:
        return bnOrZero(fromBaseUnit(sellAmountPlusFeesBaseUnit, sellAsset.precision))
          .div(assetPriceRatio)
          .toString()
      case TradeAmountInputField.BUY_FIAT:
        return bnOrZero(fromBaseUnit(sellAmountPlusFeesBaseUnit, sellAsset.precision))
          .div(assetPriceRatio)
          .toString()
      default:
        return '0'
    }
  })()

  return {
    buyAmountBeforeFeesFiat,
    sellAmountBeforeFeesFiat,
    sellAmountPlusFeesFiat,
    buyAmountAfterFeesFiat,
    buyAmountAfterFeesBaseUnit,
    sellAmountBeforeFeesBaseUnit,
    sellAmountPlusFeesBaseUnit,
    buyAmountBeforeFeesBaseUnit,
    totalTradeFeeBuyAssetBaseUnit,
    sellAmountBeforeFeesBuyAsset,
    buyAmountAfterFees,
    buyAmountBeforeFees,
    totalTradeFeeBuyAsset,
    beforeFeesBuyAsset,
  }
}

export const useGetTradeAmounts = () => {
  // Form hooks
  const { control } = useFormContext<TS>()
  const amount = useWatch({ control, name: 'amount' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyAssetUsdRate = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetUsdRate = useWatch({ control, name: 'sellAssetFiatRate' })
  const fees = useWatch({ control, name: 'fees' })
  const action = useWatch({ control, name: 'action' })

  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const buyAsset = buyTradeAsset?.asset
  const sellAsset = sellTradeAsset?.asset
  const sellAssetTradeFeeUsd = bnOrZero(fees?.sellAssetTradeFeeUsd)
  const buyAssetTradeFeeUsd = bnOrZero(fees?.buyAssetTradeFeeUsd)
  if (!bnOrZero(buyTradeAsset?.amount).gt(0) || !bnOrZero(sellTradeAsset?.amount).gt(0)) return
  if (!amount) return
  if (!action) return
  if (!fees) return
  if (!buyAsset || !sellAsset) return
  if (!buyAssetUsdRate || !sellAssetUsdRate) return

  return getTradeAmountConstants({
    amount,
    buyAsset,
    sellAsset,
    buyAssetUsdRate,
    sellAssetUsdRate,
    selectedCurrencyToUsdRate,
    sellAssetTradeFeeUsd,
    buyAssetTradeFeeUsd,
    action,
  })
}
