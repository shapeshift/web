// Helper function to convert basis points to percentage
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/types'
import { assertUnreachable, type PartialRecord } from 'lib/utils'

import { HopExecutionState, MultiHopExecutionState } from './types'

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
    case MultiHopExecutionState.Previewing:
      if (!firstHopRequiresApproval) {
        return MultiHopExecutionState.FirstHopAwaitingTradeConfirmation
      }
      return MultiHopExecutionState.FirstHopAwaitingApprovalConfirmation
    case MultiHopExecutionState.FirstHopAwaitingApprovalConfirmation:
      if (!firstHopRequiresApproval) {
        return MultiHopExecutionState.FirstHopAwaitingTradeConfirmation
      }
      return MultiHopExecutionState.FirstHopAwaitingApprovalExecution
    case MultiHopExecutionState.FirstHopAwaitingApprovalExecution:
      return MultiHopExecutionState.FirstHopAwaitingTradeConfirmation
    case MultiHopExecutionState.FirstHopAwaitingTradeConfirmation:
      return MultiHopExecutionState.FirstHopAwaitingTradeExecution
    case MultiHopExecutionState.FirstHopAwaitingTradeExecution:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      if (!secondHopRequiresApproval) {
        return MultiHopExecutionState.SecondHopAwaitingTradeConfirmation
      }
      return MultiHopExecutionState.SecondHopAwaitingApprovalConfirmation
    case MultiHopExecutionState.SecondHopAwaitingApprovalConfirmation:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      if (!secondHopRequiresApproval) {
        return MultiHopExecutionState.SecondHopAwaitingTradeConfirmation
      }
      return MultiHopExecutionState.SecondHopAwaitingApprovalExecution
    case MultiHopExecutionState.SecondHopAwaitingApprovalExecution:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      return MultiHopExecutionState.SecondHopAwaitingTradeConfirmation
    case MultiHopExecutionState.SecondHopAwaitingTradeConfirmation:
      if (!isMultiHopTrade) {
        return MultiHopExecutionState.TradeComplete
      }
      return MultiHopExecutionState.SeondHopAwaitingTradeExecution
    case MultiHopExecutionState.SeondHopAwaitingTradeExecution:
      return MultiHopExecutionState.TradeComplete
    case MultiHopExecutionState.TradeComplete:
      return MultiHopExecutionState.TradeComplete
    default:
      assertUnreachable(tradeExecutionState)
  }
}

export const getHopExecutionStates = (tradeExecutionState: MultiHopExecutionState) => {
  switch (tradeExecutionState) {
    case MultiHopExecutionState.Previewing:
      return { firstHop: HopExecutionState.Pending, secondHop: HopExecutionState.Pending }
    case MultiHopExecutionState.FirstHopAwaitingApprovalConfirmation:
      return {
        firstHop: HopExecutionState.AwaitingApprovalConfirmation,
        secondHop: HopExecutionState.Pending,
      }
    case MultiHopExecutionState.FirstHopAwaitingApprovalExecution:
      return {
        firstHop: HopExecutionState.AwaitingApprovalExecution,
        secondHop: HopExecutionState.Pending,
      }
    case MultiHopExecutionState.FirstHopAwaitingTradeConfirmation:
      return {
        firstHop: HopExecutionState.AwaitingTradeConfirmation,
        secondHop: HopExecutionState.Pending,
      }
    case MultiHopExecutionState.FirstHopAwaitingTradeExecution:
      return {
        firstHop: HopExecutionState.AwaitingTradeExecution,
        secondHop: HopExecutionState.Pending,
      }
    case MultiHopExecutionState.SecondHopAwaitingApprovalConfirmation:
      return {
        firstHop: HopExecutionState.Complete,
        secondHop: HopExecutionState.AwaitingApprovalConfirmation,
      }
    case MultiHopExecutionState.SecondHopAwaitingApprovalExecution:
      return {
        firstHop: HopExecutionState.Complete,
        secondHop: HopExecutionState.AwaitingApprovalExecution,
      }
    case MultiHopExecutionState.SecondHopAwaitingTradeConfirmation:
      return {
        firstHop: HopExecutionState.Complete,
        secondHop: HopExecutionState.AwaitingTradeConfirmation,
      }
    case MultiHopExecutionState.SeondHopAwaitingTradeExecution:
      return {
        firstHop: HopExecutionState.Complete,
        secondHop: HopExecutionState.AwaitingTradeExecution,
      }
    case MultiHopExecutionState.TradeComplete:
      return { firstHop: HopExecutionState.Complete, secondHop: HopExecutionState.Complete }
    default:
      assertUnreachable(tradeExecutionState)
  }
}
