// Helper function to convert basis points to percentage
import type { AssetId } from '@shapeshiftmonorepo/caip'
import type { ProtocolFee } from '@shapeshiftmonorepo/swapper'
import type { MarketData, PartialRecord } from '@shapeshiftmonorepo/types'

import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bn, convertPrecision } from '@/lib/bignumber/bignumber'

type SumProtocolFeesToDenomArgs = {
  marketDataByAssetIdUsd: Partial<Record<AssetId, Pick<MarketData, 'price'>>>
  outputAssetPriceUsd: BigNumber.Value
  outputExponent: number
  protocolFees: PartialRecord<AssetId, ProtocolFee> | undefined
}

// this converts the collection of protocol fees denominated in various assets to the sum of all of
// their values denominated in single asset and precision
export const sumProtocolFeesToDenom = ({
  marketDataByAssetIdUsd,
  outputAssetPriceUsd,
  outputExponent,
  protocolFees,
}: SumProtocolFeesToDenomArgs): string | undefined => {
  return protocolFees
    ? Object.entries(protocolFees)
        .reduce((acc: BigNumber, [assetId, protocolFee]: [AssetId, ProtocolFee | undefined]) => {
          if (!protocolFee) return acc
          const inputExponent = protocolFee.asset.precision
          const priceUsd = marketDataByAssetIdUsd[assetId]?.price

          if (!inputExponent || !priceUsd) return acc

          const convertedPrecisionAmountCryptoBaseUnit = convertPrecision({
            value: protocolFee.amountCryptoBaseUnit,
            inputExponent,
            outputExponent,
          })

          const rate = bn(priceUsd).div(outputAssetPriceUsd)
          return acc.plus(convertedPrecisionAmountCryptoBaseUnit.times(rate))
        }, bn(0))
        .toString()
    : undefined
}
