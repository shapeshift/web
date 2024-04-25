import { bn } from '@shapeshiftoss/chain-adapters'
import assert from 'assert'
import BigNumber from 'bignumber.js'
import type { Address } from 'viem'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { MEMO_PART_DELIMITER } from './constants'

export const addAggregatorAndDestinationToMemo = ({
  quotedMemo,
  aggregator,
  finalAssetAddress,
  minAmountOut,
  slippageBps,
  finalAssetPrecision,
}: {
  slippageBps: BigNumber.Value
  quotedMemo: string | undefined
  aggregator: Address
  finalAssetAddress: Address
  minAmountOut: string
  finalAssetPrecision: number
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  const [prefix, pool, address, nativeAssetLimitWithManualSlippage, affiliate, affiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(minAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const minimumPrecision = 5
  const endingExponential = finalAssetPrecision - minimumPrecision

  // The uniswap aggregator expects this amount to be an exponent, we need to add two numbers at the end which are used at exponents in the contract
  // We trim 10 of precisions to make sure the THORChain parser can handle the amount without precisions and rounding issues
  // If the finalAssetPrecision is under 5, the THORChain parser won't fail and we add one exponent at the end so the aggregator contract won't multiply the amount
  const finalAssetLimitWithTwoLastNumbersAsExponent =
    finalAssetPrecision <= 5
      ? `${finalAssetLimitWithManualSlippage}01`
      : `${bn(finalAssetLimitWithManualSlippage)
          .dividedBy(10 ** finalAssetPrecision)
          .toFixed(minimumPrecision, BigNumber.ROUND_DOWN)
          .replace('.', '')}${endingExponential < 10 ? `0${endingExponential}` : endingExponential}`

  // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
  assert(
    BigInt(finalAssetLimitWithTwoLastNumbersAsExponent) > 0n,
    'expected finalAssetLimitWithManualSlippage to be a positive amount',
  )

  // Thorchain memo format:
  // SWAP:ASSET:DESTADDR:LIM:AFFILIATE:FEE:DEX Aggregator Addr:Final Asset Addr:MinAmountOut
  // see https://gitlab.com/thorchain/thornode/-/merge_requests/2218 for reference
  const memo = [
    prefix,
    pool,
    address,
    nativeAssetLimitWithManualSlippage,
    affiliate,
    affiliateBps,
    aggregator,
    finalAssetAddress,
    finalAssetLimitWithTwoLastNumbersAsExponent,
  ].join(MEMO_PART_DELIMITER)

  return memo
}
