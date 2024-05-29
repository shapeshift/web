import assert from 'assert'
import { toBaseUnit } from 'lib/math'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'

import { AGGREGATOR_EXPONENT_LENGTH, THORCHAIN_PARSER_MAXIMUM_PRECISION } from '../constants'
import { MEMO_PART_DELIMITER } from './constants'

// Allows us to convert a THORChain parser value back to its base unit
// for testing purposes
export const thorchainParserToBaseUnit = (thorchainParserValue: string) => {
  if (thorchainParserValue.length < 3) {
    throw new Error('Number too short to contain an exponent.')
  }

  const exponent = parseInt(thorchainParserValue.slice(-2), 10)

  const baseNumber = thorchainParserValue.slice(0, -2)

  const fullNumber = toBaseUnit(baseNumber, exponent === 1 ? 0 : exponent)

  return fullNumber
}

export const makeMemoWithShortenedFinalAssetAmount = ({
  maxMemoSize,
  memoWithoutMinAmountOut,
  finalAssetLimitWithManualSlippage,
}: {
  maxMemoSize: number
  memoWithoutMinAmountOut: string
  finalAssetLimitWithManualSlippage: string
}) => {
  const HYPOTHETICAL_EXPONENT = '01'

  const memoArrayWithoutMinAmountOut = memoWithoutMinAmountOut.split(MEMO_PART_DELIMITER)

  // We need to construct the memo with the minAmountOut at the end so we can calculate his bytes size
  const unshortenedMemo = `${memoWithoutMinAmountOut}:${finalAssetLimitWithManualSlippage}${HYPOTHETICAL_EXPONENT}`

  const memoSizeLeft = maxMemoSize - unshortenedMemo.length

  let excessBytesToTrim = 0

  if (memoSizeLeft < 0) {
    excessBytesToTrim = Math.abs(memoSizeLeft)
  }

  const shortenedMinAmountOutLength =
    finalAssetLimitWithManualSlippage.length + AGGREGATOR_EXPONENT_LENGTH - excessBytesToTrim

  // THORChain parser uses big.ParseFloat with `0` as a precision, resulting in a precision of 18 + the integer part, so we can't more than 19 characters
  // https://gitlab.com/thorchain/thornode/-/blob/v1.131.0/x/thorchain/memo/memo_parser.go#L190
  if (shortenedMinAmountOutLength > THORCHAIN_PARSER_MAXIMUM_PRECISION + 1) {
    excessBytesToTrim += shortenedMinAmountOutLength - (THORCHAIN_PARSER_MAXIMUM_PRECISION + 1)
  }

  const shortenedAmountOut = finalAssetLimitWithManualSlippage.substring(
    0,
    finalAssetLimitWithManualSlippage.length - excessBytesToTrim,
  )

  // Paranoia check - we should never have a 0 amount out
  assert(shortenedAmountOut !== '0', 'expected final amount limit to be different than 0')

  // The THORChain aggregators expects two numbers at the end which are used at exponents in the contract
  const shouldPrependZero = excessBytesToTrim < 10

  const thorAggregatorExponential = shouldPrependZero
    ? `0${excessBytesToTrim > 0 ? excessBytesToTrim : '1'}`
    : excessBytesToTrim.toString()

  assert(thorAggregatorExponential.length === 2, 'expected exponent to be 2 numbers')

  // The THORChain aggregators expects this amount to be an exponent, we need to add two numbers at the end which are used at exponents in the contract
  const finalAssetLimitWithTwoLastNumbersAsExponent = `${shortenedAmountOut}${thorAggregatorExponential}`

  // Thorchain memo format:
  // SWAP:ASSET:DESTADDR:LIM:AFFILIATE:FEE:DEX Aggregator Addr:Final Asset Addr:MinAmountOut
  // see https://gitlab.com/thorchain/thornode/-/merge_requests/2218 for reference
  const potentialMemo = [
    ...memoArrayWithoutMinAmountOut,
    finalAssetLimitWithTwoLastNumbersAsExponent,
  ].join(MEMO_PART_DELIMITER)

  assert(
    finalAssetLimitWithTwoLastNumbersAsExponent.length <= THORCHAIN_PARSER_MAXIMUM_PRECISION + 1,
    'expected shortenedAmountOut length to be less than thorchain maximum precision',
  )

  return assertAndProcessMemo(potentialMemo)
}
