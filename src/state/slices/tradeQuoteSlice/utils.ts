// Helper function to convert basis points to percentage
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/types'
import { assertUnreachable, type PartialRecord } from 'lib/utils'

import { MultiHopExecutionState } from './types'

export const convertBasisPointsToDecimalPercentage = (basisPoints: BigNumber.Value) =>
  bnOrZero(basisPoints).div(10000)

export const convertDecimalPercentageToBasisPoints = (decimalPercentage: BigNumber.Value) =>
  bnOrZero(decimalPercentage).times(10000)

export const convertBasisPointsToPercentage = (basisPoints: BigNumber.Value) =>
  bnOrZero(basisPoints).div(100)

type SumProtocolFeesToDenomArgs = {
  cryptoMarketDataById: Partial<Record<AssetId, Pick<MarketData, 'price'>>>
  outputAssetPriceUsd: BigNumber.Value
  outputExponent: number
  protocolFees: PartialRecord<AssetId, ProtocolFee>
}

/**
 * Subtracts basis point amount from a given value.
 *
 * @param value The value to subtract basis points from.
 * @param basisPoints The number of basis points to subtract.
 * @param roundingMode
 * @returns The new number that is the input value minus the basis points of the value.
 */
export const subtractBasisPointAmount = (
  value: string,
  basisPoints: BigNumber.Value,
  roundingMode?: BigNumber.RoundingMode,
): string => {
  const bigNumValue = bn(value)

  // Basis point is 1/100th of a percent
  const percentValue = convertBasisPointsToDecimalPercentage(basisPoints)
  const subtractValue = bigNumValue.times(percentValue)

  // Subtract basis points from the original value
  const resultValue = bigNumValue.minus(subtractValue)
  return roundingMode !== undefined ? resultValue.toFixed(0, roundingMode) : resultValue.toFixed()
}

/**
 * Adds basis point amount from a given value.
 *
 * @param value The value to subtract basis points from.
 * @param basisPoints The number of basis points to subtract.
 * @param roundingMode
 * @returns The new number that is the input value minus the basis points of the value.
 */
export const addBasisPointAmount = (
  value: string,
  basisPoints: BigNumber.Value,
  roundingMode?: BigNumber.RoundingMode,
): string => {
  const bigNumValue = bn(value)

  // Basis point is 1/100th of a percent
  const percentValue = convertBasisPointsToDecimalPercentage(basisPoints)
  const addValue = bigNumValue.times(percentValue)

  // Subtract basis points from the original value
  const resultValue = bigNumValue.plus(addValue)
  return roundingMode !== undefined ? resultValue.toFixed(0, roundingMode) : resultValue.toFixed()
}

// this converts the collection of protocol fees denominated in various assets to the sum of all of
// their values denominated in single asset and precision
export const sumProtocolFeesToDenom = ({
  cryptoMarketDataById,
  outputAssetPriceUsd,
  outputExponent,
  protocolFees,
}: SumProtocolFeesToDenomArgs): string => {
  return Object.entries(protocolFees)
    .reduce((acc: BigNumber, [assetId, protocolFee]: [AssetId, ProtocolFee | undefined]) => {
      if (!protocolFee) return acc
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

// determines the next trade execution state
// please don't abstract or enhance this -
// it's intended to be as simple as possible to prevent bugs at the cost of being very verbose
export const getNextTradeExecutionState = (
  tradeExecutionState: MultiHopExecutionState,
  isMultiHopTrade: boolean,
  firstHopRequiresApproval: boolean,
  secondHopRequiresApproval: boolean,
) => {
  switch (tradeExecutionState) {
    case MultiHopExecutionState.Unknown:
      return MultiHopExecutionState.Previewing
    case MultiHopExecutionState.Previewing:
      if (!firstHopRequiresApproval) {
        return MultiHopExecutionState.Hop1AwaitingTradeConfirmation
      }
      return MultiHopExecutionState.Hop1AwaitingApprovalConfirmation
    case MultiHopExecutionState.Hop1AwaitingApprovalConfirmation:
      if (!firstHopRequiresApproval) {
        return MultiHopExecutionState.Hop1AwaitingTradeConfirmation
      }
      return MultiHopExecutionState.Hop1AwaitingApprovalExecution
    case MultiHopExecutionState.Hop1AwaitingApprovalExecution:
      return MultiHopExecutionState.Hop1AwaitingTradeConfirmation
    case MultiHopExecutionState.Hop1AwaitingTradeConfirmation:
      return MultiHopExecutionState.Hop1AwaitingTradeExecution
    case MultiHopExecutionState.Hop1AwaitingTradeExecution:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      if (!secondHopRequiresApproval) {
        return MultiHopExecutionState.Hop2AwaitingTradeConfirmation
      }
      return MultiHopExecutionState.Hop2AwaitingApprovalConfirmation
    case MultiHopExecutionState.Hop2AwaitingApprovalConfirmation:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      if (!secondHopRequiresApproval) {
        return MultiHopExecutionState.Hop2AwaitingTradeConfirmation
      }
      return MultiHopExecutionState.Hop2AwaitingApprovalExecution
    case MultiHopExecutionState.Hop2AwaitingApprovalExecution:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      return MultiHopExecutionState.Hop2AwaitingTradeConfirmation
    case MultiHopExecutionState.Hop2AwaitingTradeConfirmation:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      return MultiHopExecutionState.Hop2AwaitingTradeExecution
    case MultiHopExecutionState.Hop2AwaitingTradeExecution:
      return MultiHopExecutionState.TradeComplete
    case MultiHopExecutionState.TradeComplete:
      return MultiHopExecutionState.TradeComplete
    default:
      assertUnreachable(tradeExecutionState)
  }
}
