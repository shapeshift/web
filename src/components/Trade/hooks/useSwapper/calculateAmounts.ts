import { Asset } from '@shapeshiftoss/asset-service'
import { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'

export const calculateAmounts = async ({
  amount,
  buyAsset,
  sellAsset,
  buyAssetUsdRate,
  sellAssetUsdRate,
  action,
}: {
  amount: string
  buyAsset: Asset
  sellAsset: Asset
  buyAssetUsdRate: string
  sellAssetUsdRate: string
  action: TradeAmountInputField
}) => {
  const assetPriceRatio = bnOrZero(buyAssetUsdRate).dividedBy(sellAssetUsdRate)

  switch (action) {
    case TradeAmountInputField.SELL:
      return {
        sellAmount: toBaseUnit(amount, sellAsset.precision),
        buyAmount: toBaseUnit(bnOrZero(amount).dividedBy(assetPriceRatio), buyAsset.precision),
        fiatSellAmount: bnOrZero(amount).times(bnOrZero(sellAssetUsdRate)).toFixed(2),
      }
    case TradeAmountInputField.BUY:
      return {
        sellAmount: toBaseUnit(assetPriceRatio.times(amount), sellAsset.precision),
        buyAmount: toBaseUnit(amount, buyAsset.precision),
        fiatSellAmount: bnOrZero(amount).times(bnOrZero(buyAssetUsdRate)).toFixed(2),
      }
    case TradeAmountInputField.FIAT:
      return {
        sellAmount: toBaseUnit(bnOrZero(amount).dividedBy(sellAssetUsdRate), sellAsset.precision),
        buyAmount: toBaseUnit(bnOrZero(amount).dividedBy(buyAssetUsdRate), buyAsset.precision),
        fiatSellAmount: amount,
      }
    default:
      return {
        sellAmount: '0',
        buyAmount: '0',
        fiatSellAmount: '0',
      }
  }
}
