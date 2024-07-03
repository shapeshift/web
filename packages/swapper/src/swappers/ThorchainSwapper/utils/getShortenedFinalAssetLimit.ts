import assert from 'assert'

// The THORChain aggregators expects two numbers at the end which are used at exponents in the contract
// see _parseAmountOutMin in https://dashboard.tenderly.co/tx/mainnet/0xe16c61c114c5815555ec4342af390a1695d1cce431a8ff479bcc7d63f3d0b46a?trace=0.2.10
// 7759345496513 => 775934549650000000000000
export const AGGREGATOR_EXPONENT_LENGTH = 2

// THORChain uses `big.ParseFloat` with `0` as a precision, resulting in a precision of 18 without the integer part
// https://gitlab.com/thorchain/thornode/-/blob/v1.131.0/x/thorchain/memo/memo_parser.go#L190
export const THORCHAIN_PARSER_MAXIMUM_PRECISION = 18

export const getShortenedFinalAssetLimit = ({
  maxMemoSize,
  memoWithoutFinalAssetLimit,
  finalAssetLimitWithManualSlippage,
}: {
  maxMemoSize: number
  memoWithoutFinalAssetLimit: string
  finalAssetLimitWithManualSlippage: string
}) => {
  // The min amount out should be at least 3 characters long (1 for the number and 2 for the exponent)
  const MINIMUM_AMOUNT_OUT_LENGTH = 3
  const HYPOTHETICAL_EXPONENT = '01'

  // We need to construct the memo with the minAmountOut at the end so we can calculate his bytes size
  const unshortenedMemo = `${memoWithoutFinalAssetLimit}:${finalAssetLimitWithManualSlippage}${HYPOTHETICAL_EXPONENT}`

  const memoSizeLeft = maxMemoSize - unshortenedMemo.length

  let excessBytesToTrim = 0

  if (memoSizeLeft < 0) {
    excessBytesToTrim = Math.abs(memoSizeLeft)
  }

  const shortenedMinAmountOutLength =
    finalAssetLimitWithManualSlippage.length + AGGREGATOR_EXPONENT_LENGTH - excessBytesToTrim

  // Paranoia check - can't shorten more than the initial min amount length
  assert(
    shortenedMinAmountOutLength >= MINIMUM_AMOUNT_OUT_LENGTH,
    'min amount chars length should be 3 or more',
  )

  // THORChain parser uses big.ParseFloat with `0` as a precision, resulting in a precision of 18 + the integer part, so we can't have more than 19 characters
  // https://gitlab.com/thorchain/thornode/-/blob/v1.131.0/x/thorchain/memo/memo_parser.go#L190
  if (shortenedMinAmountOutLength > THORCHAIN_PARSER_MAXIMUM_PRECISION + 1) {
    excessBytesToTrim += shortenedMinAmountOutLength - (THORCHAIN_PARSER_MAXIMUM_PRECISION + 1)
  } else if (
    shortenedMinAmountOutLength <= THORCHAIN_PARSER_MAXIMUM_PRECISION + 1 &&
    // Only add one byte if we don't trim for another reason before
    !excessBytesToTrim
  ) {
    // If the length is less than the maximum precision, we need to remove one byte to the final asset amount because we absolutely need to add an exponent
    // or the aggregator will multiply the number by 10 and then it will revert due to an higher expected amount than we can receive
    excessBytesToTrim += 1
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

  assert(thorAggregatorExponential.length === 2, 'expected exponent to be 2 digits')

  // The THORChain aggregators expects this amount to be an exponent, we need to add two numbers at the end which are used at exponents in the contract
  const shortenedAmountOutWithTwoLastNumbersAsExponent = `${shortenedAmountOut}${thorAggregatorExponential}`

  assert(
    shortenedAmountOutWithTwoLastNumbersAsExponent.length <= THORCHAIN_PARSER_MAXIMUM_PRECISION + 1,
    'expected shortenedAmountOut length to be less than thorchain maximum precision',
  )

  return shortenedAmountOutWithTwoLastNumbersAsExponent
}
