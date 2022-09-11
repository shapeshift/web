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
}: CalculateAmountsArgs): CalculateAmountsReturn => {
  const assetPriceRatio = bnOrZero(buyAssetUsdRate).dividedBy(sellAssetUsdRate)
  const usdAmount = bnOrZero(amount).dividedBy(selectedCurrencyToUsdRate)
  const cryptoSellAmount = toBaseUnit(usdAmount.dividedBy(sellAssetUsdRate), sellAsset.precision)
  const cryptoBuyAmount = toBaseUnit(usdAmount.dividedBy(buyAssetUsdRate), buyAsset.precision)

  switch (action) {
    case TradeAmountInputField.SELL_CRYPTO:
      const buyAmount = toBaseUnit(bnOrZero(amount).dividedBy(assetPriceRatio), buyAsset.precision)
      return {
        cryptoSellAmount: toBaseUnit(amount, sellAsset.precision),
        cryptoBuyAmount: buyAmount,
        fiatSellAmount: bnOrZero(amount)
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(sellAssetUsdRate))
          .toFixed(2),
        fiatBuyAmount: bnOrZero(fromBaseUnit(buyAmount, buyAsset.precision))
          .times(selectedCurrencyToUsdRate)
          .times(buyAssetUsdRate)
          .toFixed(2), // TODO: subtract fee
      }
    case TradeAmountInputField.SELL_FIAT:
      return {
        cryptoSellAmount,
        cryptoBuyAmount, // TODO: subtract fee
        fiatSellAmount: amount,
        fiatBuyAmount: amount, // TODO: subtract fee
      }
    case TradeAmountInputField.BUY_CRYPTO:
      return {
        cryptoSellAmount: toBaseUnit(assetPriceRatio.times(amount), sellAsset.precision), // TODO: add fee
        cryptoBuyAmount: toBaseUnit(amount, buyAsset.precision),
        fiatSellAmount: bnOrZero(amount)
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(buyAssetUsdRate))
          .toFixed(2), // TODO: add fee
        fiatBuyAmount: bnOrZero(amount)
          .times(selectedCurrencyToUsdRate)
          .times(bnOrZero(buyAssetUsdRate))
          .toFixed(2),
      }
    case TradeAmountInputField.BUY_FIAT:
      return {
        cryptoSellAmount, // TODO: add fee
        cryptoBuyAmount,
        fiatSellAmount: amount, // TODO: add fee
        fiatBuyAmount: amount,
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
