import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { TradeQuote } from 'lib/swapper/api'
import { sumProtocolFeesToDenom } from 'state/zustand/swapperStore/utils'

/*
  The ratio is calculated by dividing the total fiat value of the receive amount
  by the total fiat value of the sell amount (including network fees).

  Higher ratios are better.

  E.g. if the fiat value of the sell amount is 100 and the fiat value of the receive amount is 90,
  the ratio is 0.9.

  Negative ratios are possible when the fees exceed the sell amount.
  This is allowed to let us choose 'the best from a bad bunch'.
*/
// TODO(woodenfurniture): pass in step here not full quote
export const getRatioFromQuote = ({
  quote,
  feeAsset,
  cryptoMarketDataById,
}: {
  quote: TradeQuote<ChainId>
  feeAsset: Asset
  cryptoMarketDataById: Partial<Record<AssetId, Pick<MarketData, 'price'>>>
}): number | undefined => {
  const buyAssetUsdRate = cryptoMarketDataById[quote.steps[0].buyAsset.assetId]?.price
  const sellAssetUsdRate = cryptoMarketDataById[quote.steps[0].sellAsset.assetId]?.price
  const feeAssetUsdRate = cryptoMarketDataById[feeAsset.assetId]?.price

  const sellAmountUsd = bnOrZero(
    fromBaseUnit(
      quote.steps[0].sellAmountBeforeFeesCryptoBaseUnit,
      quote.steps[0].sellAsset.precision,
    ),
  ).times(sellAssetUsdRate ?? '0')

  const receiveAmountUsd = bnOrZero(
    fromBaseUnit(
      quote.steps[0].buyAmountBeforeFeesCryptoBaseUnit,
      quote.steps[0].buyAsset.precision,
    ),
  ).times(buyAssetUsdRate ?? '0')

  const networkFeeUsd = bnOrZero(
    fromBaseUnit(quote.steps[0].feeData.networkFeeCryptoBaseUnit, feeAsset.precision),
  ).times(feeAssetUsdRate ?? '0')

  const totalProtocolFeesUsd = sumProtocolFeesToDenom({
    cryptoMarketDataById,
    outputAssetPriceUsd: '1', // 1 USD costs 1 USD
    outputExponent: 0, // 0 exponent = human
    protocolFees: quote.steps[0].feeData.protocolFees,
  })

  const totalSendAmountUsd = sellAmountUsd.plus(networkFeeUsd).plus(totalProtocolFeesUsd)
  const ratio = receiveAmountUsd.div(totalSendAmountUsd)

  return ratio.isFinite() && networkFeeUsd.gte(0) ? ratio.toNumber() : -Infinity
}
