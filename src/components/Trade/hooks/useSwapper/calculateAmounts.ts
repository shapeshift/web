import type { Asset } from '@shapeshiftoss/asset-service'
import { TradeAmountInputField } from 'components/Trade/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero, maximumOrZero } from 'lib/bignumber/bignumber'
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
  cryptoSellAmount: string
  cryptoBuyAmount: string
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
  const cryptoSellAmount = toBaseUnit(usdAmount.dividedBy(sellAssetUsdRate), sellAsset.precision)
  const cryptoBuyAmount = toBaseUnit(usdAmount.dividedBy(buyAssetUsdRate), buyAsset.precision)
  const sellAssetTradeFeeUsdBaseUnit = toBaseUnit(
    sellAssetTradeFeeUsd.div(sellAssetUsdRate),
    buyAsset.precision,
  )
  const buyAssetTradeFeeUsdBaseUnit = toBaseUnit(buyAssetTradeFeeUsd, buyAsset.precision)

  switch (action) {
    case TradeAmountInputField.SELL_CRYPTO: {
      const buyAmount = toBaseUnit(bnOrZero(amount).dividedBy(assetPriceRatio), buyAsset.precision)
      const buyAmountAfterFees = bnOrZero(buyAmount)
        // TODO: Add back fees
        .minus(
          maximumOrZero(sellAssetTradeFeeUsdBaseUnit, buyAssetTradeFeeUsdBaseUnit).div(
            assetPriceRatio,
          ),
        )
        .toString()
      return {
        cryptoSellAmount: toBaseUnit(amount, sellAsset.precision),
        cryptoBuyAmount: buyAmountAfterFees,
        fiatSellAmount: bnOrZero(amount)
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(sellAssetUsdRate))
          .toFixed(2),
        fiatBuyAmount: bnOrZero(fromBaseUnit(buyAmountAfterFees, buyAsset.precision))
          .times(selectedCurrencyToUsdRate)
          .times(buyAssetUsdRate)
          .toFixed(2),
      }
    }
    case TradeAmountInputField.SELL_FIAT: {
      const buyAmountAfterFees = bnOrZero(cryptoBuyAmount)
        .minus(sellAssetTradeFeeUsdBaseUnit)
        .toString()
      return {
        cryptoSellAmount,
        cryptoBuyAmount: buyAmountAfterFees,
        fiatSellAmount: bnOrZero(amount).toFixed(2),
        fiatBuyAmount: bnOrZero(fromBaseUnit(buyAmountAfterFees, buyAsset.precision))
          .times(selectedCurrencyToUsdRate)
          .times(buyAssetUsdRate)
          .toFixed(2),
      }
    }
    case TradeAmountInputField.BUY_CRYPTO: {
      const sellAssetTradeFeeUsdToSellAsset = bnOrZero(sellAssetTradeFeeUsd).times(assetPriceRatio)
      const sellAssetTradeFeeUsdToSellAssetBaseUnit = toBaseUnit(
        sellAssetTradeFeeUsdToSellAsset,
        sellAsset.precision,
      )
      const sellAmount = toBaseUnit(assetPriceRatio.times(amount), sellAsset.precision)
      const sellAmountWithFees = bnOrZero(sellAmount)
        .plus(sellAssetTradeFeeUsdToSellAssetBaseUnit)
        .toString()
      return {
        cryptoSellAmount: sellAmountWithFees,
        cryptoBuyAmount: toBaseUnit(amount, buyAsset.precision),
        fiatSellAmount: bnOrZero(fromBaseUnit(sellAmountWithFees, sellAsset.precision))
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(sellAssetUsdRate))
          .toFixed(2),
        fiatBuyAmount: bnOrZero(amount)
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(buyAssetUsdRate))
          .toFixed(2),
      }
    }
    case TradeAmountInputField.BUY_FIAT: {
      const sellAssetTradeFeeUsdToSellAsset = bnOrZero(sellAssetTradeFeeUsd).times(assetPriceRatio)

      const sellAssetTradeFeeUsdToSellAssetBaseUnit = toBaseUnit(
        sellAssetTradeFeeUsdToSellAsset,
        sellAsset.precision,
      )
      const sellAmountWithFees = bnOrZero(cryptoSellAmount)
        .plus(sellAssetTradeFeeUsdToSellAssetBaseUnit)
        .toString()
      return {
        cryptoSellAmount: sellAmountWithFees,
        cryptoBuyAmount,
        fiatSellAmount: bnOrZero(fromBaseUnit(sellAmountWithFees, sellAsset.precision))
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(sellAssetUsdRate))
          .toFixed(2),
        fiatBuyAmount: bnOrZero(amount).toFixed(2),
      }
    }
    default:
      return {
        cryptoSellAmount: '0',
        cryptoBuyAmount: '0',
        fiatSellAmount: '0',
        fiatBuyAmount: '0',
      }
  }
}
