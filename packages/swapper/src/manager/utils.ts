import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId } from '@shapeshiftoss/caip'

import { Swapper, TradeQuote } from '../api'
import { bnOrZero, fromBaseUnit } from '../swappers/utils/bignumber'
import { isFulfilled } from '../typeGuards'

/*
  The ratio is calculated by dividing the total fiat value of the receive amount
  by the total fiat value of the sell amount (including network fees).

  Higher ratios are better.

  E.g. if the fiat value of the sell amount is 100 and the fiat value of the receive amount is 90,
  the ratio is 0.9.

  Negative ratios are possible when the fees exceed the sell amount.
  This is allowed to let us choose 'the best from a bad bunch'.
*/
export const getRatioFromQuote = async (
  quote: TradeQuote<ChainId>,
  swapper: Swapper<ChainId>,
  feeAsset: Asset,
): Promise<number | undefined> => {
  /*
    We make an assumption here that swappers return comparable asset rates.
    If a swapper were to undervalue the outbound asset and overvalue the inbound asset
    then the ratio would be incorrectly in its favour.
  */
  const quoteAssets = [quote.sellAsset, quote.buyAsset, feeAsset]
  const usdRatePromises = quoteAssets.map((asset) => swapper.getUsdRate(asset))
  const [sellAssetUsdRate, buyAssetUsdRate, feeAssetUsdRate] = (
    await Promise.allSettled(usdRatePromises)
  )
    .filter(isFulfilled)
    .map((p) => p.value)

  const totalSellAmountFiat = bnOrZero(
    fromBaseUnit(quote.sellAmountBeforeFeesCryptoBaseUnit, quote.sellAsset.precision),
  )
    .times(sellAssetUsdRate)
    .plus(bnOrZero(quote.feeData.sellAssetTradeFeeUsd))

  const totalReceiveAmountFiat = bnOrZero(
    fromBaseUnit(quote.buyAmountCryptoBaseUnit, quote.buyAsset.precision),
  )
    .times(buyAssetUsdRate)
    .minus(bnOrZero(quote.feeData.buyAssetTradeFeeUsd))
  const networkFeeFiat = bnOrZero(
    fromBaseUnit(quote.feeData.networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(feeAssetUsdRate)

  const totalSendAmountFiat = totalSellAmountFiat.plus(networkFeeFiat)
  const ratio = totalReceiveAmountFiat.div(totalSendAmountFiat)

  return ratio.isFinite() ? ratio.toNumber() : undefined
}
