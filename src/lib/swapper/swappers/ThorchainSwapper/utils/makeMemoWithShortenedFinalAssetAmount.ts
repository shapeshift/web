import assert from 'assert'
import { toBaseUnit } from 'lib/math'
import { assertAndProcessMemo } from 'lib/utils/thorchain/memo'

import { MEMO_PART_DELIMITER } from './constants'

// The THORChain aggregators expects two numbers at the end which are used at exponents in the contract
// see _parseAmountOutMin in https://dashboard.tenderly.co/tx/mainnet/0xe16c61c114c5815555ec4342af390a1695d1cce431a8ff479bcc7d63f3d0b46a?trace=0.2.10
// 7759345496513 => 775934549650000000000000
export const AGGREGATOR_EXPONENT_LENGTH = 2

// THORChain uses `big.ParseFloat` with `0` as a precision, resulting in a precision of 18 without the integer part
// https://gitlab.com/thorchain/thornode/-/blob/v1.131.0/x/thorchain/memo/memo_parser.go#L190
export const THORCHAIN_PARSER_MAXIMUM_PRECISION = 18

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
  memoWithoutFinalAssetAmountOut,
  finalAssetLimitWithManualSlippage,
}: {
  maxMemoSize: number
  memoWithoutFinalAssetAmountOut: string
  finalAssetLimitWithManualSlippage: string
}) => {
  const HYPOTHETICAL_EXPONENT = '01'

  const memoArrayWithoutMinAmountOut = memoWithoutFinalAssetAmountOut.split(MEMO_PART_DELIMITER)

  // We need to construct the memo with the minAmountOut at the end so we can calculate his bytes size
  const unshortenedMemo = `${memoWithoutFinalAssetAmountOut}:${finalAssetLimitWithManualSlippage}${HYPOTHETICAL_EXPONENT}`

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

  console.log(thorAggregatorExponential, 'thorAggregatorExponential yolo')

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
