import type { BigNumber } from './bignumber/bignumber'
import { bn, bnOrZero } from './bignumber/bignumber'

export const convertBasisPointsToDecimalPercentage = (basisPoints: BigNumber.Value) =>
  bnOrZero(basisPoints).div(10000)

export const convertDecimalPercentageToBasisPoints = (decimalPercentage: BigNumber.Value) =>
  bnOrZero(decimalPercentage).times(10000)

export const convertBasisPointsToPercentage = (basisPoints: BigNumber.Value) =>
  bnOrZero(basisPoints).div(100)

export const convertPercentageToBasisPoints = (percentage: BigNumber.Value) =>
  bnOrZero(percentage).times(100)

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
