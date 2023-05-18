// Helper function to convert basis points to percentage
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/api'

export const convertBasisPointsToDecimalPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(10000)

export const convertBasisPointsToPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(100)

type SumProtocolFeesToDenomArgs = {
  cryptoMarketDataById: Partial<Record<AssetId, Pick<MarketData, 'price'>>>
  outputAssetPriceUsd: string
  outputExponent: number
  protocolFees: Record<AssetId, ProtocolFee>
}

export const sumProtocolFeesToDenom = ({
  cryptoMarketDataById,
  outputAssetPriceUsd,
  outputExponent,
  protocolFees,
}: SumProtocolFeesToDenomArgs): string => {
  return Object.entries(protocolFees)
    .reduce((acc: BigNumber, [assetId, protocolFee]: [AssetId, ProtocolFee]) => {
      const inputExponent = protocolFee.asset.precision
      const priceUsd = cryptoMarketDataById[assetId]?.price

      if (!inputExponent || !priceUsd) return acc

      const rebasedAmountCryptoBaseUnit = convertPrecision({
        value: protocolFee.amountCryptoBaseUnit,
        inputExponent,
        outputExponent,
      })

      const rate = bn(outputAssetPriceUsd).div(priceUsd)
      return acc.plus(rebasedAmountCryptoBaseUnit.times(rate))
    }, bn(0))
    .toString()
}
