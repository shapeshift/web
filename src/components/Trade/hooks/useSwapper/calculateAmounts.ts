import type { Asset } from '@shapeshiftoss/asset-service'
import { TradeAmountInputField } from 'components/Trade/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'

type CalculateAmountsArgs = {
  amount: string
  buyAsset: Asset
  sellAsset: Asset
  buyAssetUsdRate: string
  sellAssetUsdRate: string
  action: TradeAmountInputField
  selectedCurrencyToUsdRate: BigNumber
  tradeFee: BigNumber
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
  tradeFee,
}: CalculateAmountsArgs): CalculateAmountsReturn => {
  const assetPriceRatio = bnOrZero(buyAssetUsdRate).dividedBy(sellAssetUsdRate)
  const usdAmount = bnOrZero(amount).dividedBy(selectedCurrencyToUsdRate)
  const cryptoSellAmount = toBaseUnit(usdAmount.dividedBy(sellAssetUsdRate), sellAsset.precision)
  const cryptoBuyAmount = toBaseUnit(usdAmount.dividedBy(buyAssetUsdRate), buyAsset.precision)
  const tradeFeeBaseUnit = toBaseUnit(tradeFee, buyAsset.precision)

  switch (action) {
    case TradeAmountInputField.SELL_CRYPTO: {
      const buyAmount = toBaseUnit(bnOrZero(amount).dividedBy(assetPriceRatio), buyAsset.precision)
      const buyAmountAfterFees = bnOrZero(buyAmount).minus(tradeFeeBaseUnit).toString()
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
      const buyAmountAfterFees = bnOrZero(cryptoBuyAmount).minus(tradeFeeBaseUnit).toString()
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
      const tradeFeeToSellAsset = bnOrZero(tradeFee).times(assetPriceRatio)
      const tradeFeeToSellAssetBaseUnit = toBaseUnit(tradeFeeToSellAsset, sellAsset.precision)
      const sellAmount = toBaseUnit(assetPriceRatio.times(amount), sellAsset.precision)
      const sellAmountWithFees = bnOrZero(sellAmount).plus(tradeFeeToSellAssetBaseUnit).toString()
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
      const tradeFeeToSellAsset = bnOrZero(tradeFee).times(assetPriceRatio)

      const tradeFeeToSellAssetBaseUnit = toBaseUnit(tradeFeeToSellAsset, sellAsset.precision)
      const sellAmountWithFees = bnOrZero(cryptoSellAmount)
        .plus(tradeFeeToSellAssetBaseUnit)
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
