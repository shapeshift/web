import type { Asset } from '@shapeshiftoss/asset-service'
import { TradeAmountInputField } from 'components/Trade/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'

export type CalculateAmountsArgs = {
  amount: string
  buyAsset: Asset
  sellAsset: Asset
  buyAssetUsdRate: string
  sellAssetUsdRate: string
  action: TradeAmountInputField
  selectedCurrencyToUsdRate: BigNumber
  buyAssetTradeFeeUsd: BigNumber
  sellAssetTradeFeeUsd: BigNumber
}

type CalculateAmountsReturn = {
  sellAmountSellAssetBaseUnit: string
  buyAmountBuyAssetBaseUnit: string
  fiatSellAmount: string
  fiatBuyAmount: string
}

export const calculateAmounts = ({
  amount,
  buyAsset,
  sellAsset,
  buyAssetUsdRate,
  sellAssetUsdRate,
  action,
  selectedCurrencyToUsdRate,
  sellAssetTradeFeeUsd,
  buyAssetTradeFeeUsd,
}: CalculateAmountsArgs): CalculateAmountsReturn => {
  const assetPriceRatio = bnOrZero(buyAssetUsdRate).dividedBy(sellAssetUsdRate)
  const usdAmount = bnOrZero(amount).dividedBy(selectedCurrencyToUsdRate)
  const sellAmountBeforeFeesBaseUnit = toBaseUnit(
    usdAmount.dividedBy(sellAssetUsdRate),
    sellAsset.precision,
  )
  const buyAmountBeforeFeesBaseUnit = toBaseUnit(
    usdAmount.dividedBy(buyAssetUsdRate),
    buyAsset.precision,
  )

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
      bnOrZero(buyAssetTradeFeeBuyAssetBaseUnit).div(assetPriceRatio),
      buyAsset.precision,
    ),
    sellAsset.precision,
  )

  // The total fees in the sell asset base unit
  const totalTradeFeeSellAssetBaseUnit = bnOrZero(buyAssetTradeFeeSellAssetBaseUnit).plus(
    sellAssetTradeFeeSellAssetBaseUnit,
  )

  // The total fees in the buy asset base unit
  const totalTradeFeeBuyAssetBaseUnit = bnOrZero(buyAssetTradeFeeBuyAssetBaseUnit).plus(
    sellAssetTradeFeeBuyAssetBaseUnit,
  )

  const buyAmountAfterFeesBaseUnit = bnOrZero(buyAmountBeforeFeesBaseUnit)
    .minus(totalTradeFeeBuyAssetBaseUnit)
    .toString()
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
  const buyAmountAfterFeesFiat = bnOrZero(
    fromBaseUnit(buyAmountAfterFeesBaseUnit, buyAsset.precision),
  )
    .times(buyAssetUsdRate)
    .times(selectedCurrencyToUsdRate)
    .toFixed(2)

  switch (action) {
    case TradeAmountInputField.SELL_CRYPTO: {
      return {
        sellAmountSellAssetBaseUnit: toBaseUnit(amount, sellAsset.precision),
        buyAmountBuyAssetBaseUnit: buyAmountAfterFeesBaseUnit,
        fiatSellAmount: sellAmountBeforeFeesFiat,
        fiatBuyAmount: buyAmountAfterFeesFiat,
      }
    }
    case TradeAmountInputField.SELL_FIAT: {
      return {
        sellAmountSellAssetBaseUnit: sellAmountBeforeFeesBaseUnit,
        buyAmountBuyAssetBaseUnit: buyAmountAfterFeesBaseUnit,
        fiatSellAmount: bnOrZero(amount).toFixed(2),
        fiatBuyAmount: buyAmountAfterFeesFiat,
      }
    }
    case TradeAmountInputField.BUY_CRYPTO: {
      return {
        sellAmountSellAssetBaseUnit: sellAmountPlusFeesBaseUnit,
        buyAmountBuyAssetBaseUnit: toBaseUnit(amount, buyAsset.precision),
        fiatSellAmount: sellAmountPlusFeesFiat,
        fiatBuyAmount: buyAmountBeforeFeesFiat,
      }
    }
    case TradeAmountInputField.BUY_FIAT: {
      return {
        sellAmountSellAssetBaseUnit: sellAmountPlusFeesBaseUnit,
        buyAmountBuyAssetBaseUnit: buyAmountBeforeFeesBaseUnit,
        fiatSellAmount: sellAmountPlusFeesFiat,
        fiatBuyAmount: bnOrZero(amount).toFixed(2),
      }
    }
    default:
      return {
        sellAmountSellAssetBaseUnit: '0',
        buyAmountBuyAssetBaseUnit: '0',
        fiatSellAmount: '0',
        fiatBuyAmount: '0',
      }
  }
}
