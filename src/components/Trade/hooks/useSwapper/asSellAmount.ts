import { Swapper } from '@shapeshiftoss/swapper'
import { Asset } from '@shapeshiftoss/types'
import { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'

export const asSellAmount = async ({
  amount,
  buyAsset,
  sellAsset,
  swapper,
  action,
}: {
  amount: string
  buyAsset: Asset
  sellAsset: Asset
  swapper: Swapper
  action: TradeAmountInputField
}) => {
  const sellAssetUsdRate = bnOrZero(
    await swapper.getUsdRate({
      symbol: sellAsset.symbol,
      tokenId: sellAsset.tokenId,
    }),
  )
  const buyAssetUsdRate = bnOrZero(
    await swapper.getUsdRate({
      symbol: buyAsset.symbol,
      tokenId: buyAsset.tokenId,
    }),
  )

  const assetPriceRatio = buyAssetUsdRate.dividedBy(sellAssetUsdRate)

  let sellAmount
  let buyAmount
  let fiatSellAmount

  if (action === TradeAmountInputField.SELL) {
    sellAmount = amount
    buyAmount = bnOrZero(amount).dividedBy(assetPriceRatio)
    fiatSellAmount = bnOrZero(amount).times(bnOrZero(sellAssetUsdRate)).toFixed(2)
  } else if (action === TradeAmountInputField.BUY) {
    buyAmount = amount
    sellAmount = assetPriceRatio.times(amount)
    fiatSellAmount = bnOrZero(amount).times(bnOrZero(buyAssetUsdRate)).toFixed(2)
  } else if (action === TradeAmountInputField.FIAT) {
    sellAmount = bnOrZero(amount).dividedBy(sellAssetUsdRate)
    buyAmount = bnOrZero(amount).dividedBy(buyAssetUsdRate)
    fiatSellAmount = amount
  } else {
    sellAmount = '0'
    buyAmount = '0'
    fiatSellAmount = '0'
  }
  return {
    sellAmount: toBaseUnit(sellAmount, sellAsset.precision),
    buyAmount: toBaseUnit(buyAmount, buyAsset.precision),
    fiatSellAmount,
    sellAssetUsdRate: sellAssetUsdRate.toString(),
    buyAssetUsdRate: sellAssetUsdRate.toString(),
  }
}
