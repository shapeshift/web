import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { TradeQuote } from 'lib/swapper/api'

/*
  The ratio is calculated by dividing the total fiat value of the receive amount
  by the total fiat value of the sell amount (including network fees).

  Higher ratios are better.

  E.g. if the fiat value of the sell amount is 100 and the fiat value of the receive amount is 90,
  the ratio is 0.9.

  Negative ratios are possible when the fees exceed the sell amount.
  This is allowed to let us choose 'the best from a bad bunch'.
*/
export const getRatioFromQuote = ({
  quote,
  feeAsset,
  buyAssetFiatRate,
  sellAssetFiatRate,
  feeAssetFiatRate,
}: {
  quote: TradeQuote<ChainId>
  feeAsset: Asset
  buyAssetFiatRate?: string
  sellAssetFiatRate?: string
  feeAssetFiatRate?: string
}): number | undefined => {
  const totalSellAmountFiat = bnOrZero(
    fromBaseUnit(quote.sellAmountBeforeFeesCryptoBaseUnit, quote.sellAsset.precision),
  )
    .times(sellAssetFiatRate ?? '0')
    .plus(bnOrZero(quote.feeData.sellAssetTradeFeeUsd))

  const totalReceiveAmountFiat = bnOrZero(
    fromBaseUnit(quote.buyAmountBeforeFeesCryptoBaseUnit, quote.buyAsset.precision),
  )
    .times(buyAssetFiatRate ?? '0')
    .minus(bnOrZero(quote.feeData.buyAssetTradeFeeUsd))
  const networkFeeFiat = bnOrZero(
    fromBaseUnit(quote.feeData.networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(feeAssetFiatRate ?? '0')

  const totalSendAmountFiat = totalSellAmountFiat.plus(networkFeeFiat)
  const ratio = totalReceiveAmountFiat.div(totalSendAmountFiat)

  return ratio.isFinite() && networkFeeFiat.gte(0) ? ratio.toNumber() : -Infinity
}
