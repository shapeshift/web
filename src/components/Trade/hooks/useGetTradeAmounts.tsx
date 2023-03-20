import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { selectFiatToUsdRate } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

type GetTradeAmountConstantsArgs = CalculateAmountsArgs

export const getTradeAmountConstants = ({
  amount,
  buyAsset,
  sellAsset,
  buyAssetFiatRate,
  sellAssetFiatRate,
  sellAssetTradeFeeFiat,
  buyAssetTradeFeeFiat,
  action,
}: GetTradeAmountConstantsArgs) => {
  const assetPriceRatio = bnOrZero(buyAssetFiatRate).dividedBy(sellAssetFiatRate)

  const sellAmountBeforeFeesBaseUnit: string = (() => {
    switch (action) {
      case TradeAmountInputField.BUY_CRYPTO:
        return toBaseUnit(bnOrZero(amount).times(assetPriceRatio), sellAsset.precision)
      case TradeAmountInputField.SELL_CRYPTO:
        return toBaseUnit(amount, sellAsset.precision)
      case TradeAmountInputField.BUY_FIAT:
      case TradeAmountInputField.SELL_FIAT:
        return toBaseUnit(bnOrZero(amount).dividedBy(sellAssetFiatRate), sellAsset.precision)
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
        return toBaseUnit(bnOrZero(amount).dividedBy(buyAssetFiatRate), buyAsset.precision)
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
    sellAssetTradeFeeFiat.div(sellAssetFiatRate),
    sellAsset.precision,
  )

  const buyAssetTradeFeeBuyAssetBaseUnit = toBaseUnit(
    buyAssetTradeFeeFiat.div(buyAssetFiatRate),
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
    .times(buyAssetFiatRate)
    .toFixed(2)

  const sellAmountBeforeFeesFiat = bnOrZero(
    fromBaseUnit(sellAmountBeforeFeesBaseUnit, sellAsset.precision),
  )
    .times(sellAssetFiatRate)
    .toFixed(2)

  const sellAmountPlusFeesFiat = bnOrZero(
    fromBaseUnit(sellAmountPlusFeesBaseUnit, sellAsset.precision),
  )
    .times(sellAssetFiatRate)
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
    .times(buyAssetFiatRate)
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
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const buyAssetFiatRate = useSwapperStore(state => state.buyAssetFiatRate)
  const sellAssetFiatRate = useSwapperStore(state => state.sellAssetFiatRate)
  const action = useSwapperStore(state => state.action)
  const amount = useSwapperStore(state => state.amount)
  const fees = useSwapperStore(state => state.fees)
  const buyAsset = useSwapperStore(state => state.buyAsset)
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const sellAmountCryptoPrecision = useSwapperStore(state => state.sellAmountCryptoPrecision)
  const buyAmountCryptoPrecision = useSwapperStore(state => state.buyAmountCryptoPrecision)
  const sellAssetTradeFeeUsd = bnOrZero(fees?.sellAssetTradeFeeUsd)
  const buyAssetTradeFeeUsd = bnOrZero(fees?.buyAssetTradeFeeUsd)
  const buyAssetTradeFeeFiat = bnOrZero(buyAssetTradeFeeUsd).times(selectedCurrencyToUsdRate)
  const sellAssetTradeFeeFiat = bnOrZero(sellAssetTradeFeeUsd).times(selectedCurrencyToUsdRate)

  if (!bnOrZero(buyAmountCryptoPrecision).gt(0) || !bnOrZero(sellAmountCryptoPrecision).gt(0))
    return
  if (!amount) return
  if (!action) return
  if (!fees) return
  if (!buyAsset || !sellAsset) return
  if (!buyAssetFiatRate || !sellAssetFiatRate) return

  return getTradeAmountConstants({
    amount,
    buyAsset,
    sellAsset,
    buyAssetFiatRate,
    sellAssetFiatRate,
    sellAssetTradeFeeFiat,
    buyAssetTradeFeeFiat,
    action,
  })
}
