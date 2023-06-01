// Helper function to convert basis points to percentage
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'
import { BigNumber, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { ProtocolFee, TradeQuoteStep } from 'lib/swapper/api'

export const convertBasisPointsToDecimalPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(10000)

export const convertDecimalPercentageToBasisPoints = (decimalPercentage: string) =>
  bnOrZero(decimalPercentage).times(10000)

export const convertBasisPointsToPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(100)

type SumProtocolFeesToDenomArgs = {
  cryptoMarketDataById: Partial<Record<AssetId, Pick<MarketData, 'price'>>>
  outputAssetPriceUsd: string
  outputExponent: number
  protocolFees: Record<AssetId, ProtocolFee>
}

/**
 * Subtracts basis point amount from a given value.
 *
 * @param value The value to subtract basis points from.
 * @param basisPoints The number of basis points to subtract.
 * @param roundUp Round up the result to the nearest integer.
 * @returns The new number that is the input value minus the basis points of the value.
 */
export const subtractBasisPointAmount = (
  value: string,
  basisPoints: string,
  roundUp?: boolean,
): string => {
  const bigNumValue = bn(value)

  // Basis point is 1/100th of a percent
  const percentValue = convertBasisPointsToDecimalPercentage(basisPoints)
  const subtractValue = bigNumValue.times(percentValue)

  // Subtract basis points from the original value
  const resultValue = bigNumValue.minus(subtractValue)
  return roundUp ? resultValue.toFixed(0, BigNumber.ROUND_UP) : resultValue.toFixed()
}

/**
 * Converts the collection of protocol fees denominated in various assets to the sum of all of
 * their values denominated in single asset and precision
 *
 * @param param0.cryptoMarketDataById The crypto market data denominated in USD (DO NOT use fiat market data)
 * @param param0.outputAssetPriceUsd The price in USD of the output asset
 * @param param0.outputExponent The exponent of the output asset, this may be Asset.precision for crypto assets
 * @param param0.protocolFees The protocol fees to sum
 * @returns The sum of all protocol fees denominated in the output asset
 */
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

      const convertedPrecisionAmountCryptoBaseUnit = convertPrecision({
        value: protocolFee.amountCryptoBaseUnit,
        inputExponent,
        outputExponent,
      })

      const rate = bn(priceUsd).div(outputAssetPriceUsd)
      return acc.plus(convertedPrecisionAmountCryptoBaseUnit.times(rate))
    }, bn(0))
    .toString()
}

/**
 * Sums the protocol fees for a specific asset across multiple trade steps.
 *
 * @param targetAsset The asset to sum
 * @param steps The TradeQuoteSteps containing the protocol fees
 * @param onlyRequiresBalance Whether to only sum protocol fees that require balance for that asset
 * @returns The total payable protocol fee for the target, in crypto base unit
 */
export const sumProtocolFeesForAssetCryptoBaseUnit = (
  targetAsset: Asset,
  steps: TradeQuoteStep<ChainId, false>[],
  onlyRequiresBalance: boolean,
) => {
  return steps
    .map(step => step.feeData.protocolFees[targetAsset.assetId])
    .filter(protocolFee => protocolFee && (!onlyRequiresBalance || protocolFee.requiresBalance))
    .reduce((acc, protocolFee) => acc.plus(protocolFee.amountCryptoBaseUnit), bn(0))
}
