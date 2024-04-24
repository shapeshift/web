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
}: {
  slippageBps: BigNumber.Value
  quotedMemo: string | undefined
  aggregator: Address
  finalAssetAddress: Address
  minAmountOut: string
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  const [prefix, pool, address, nativeAssetLimitWithManualSlippage, affiliate, affiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const finalAssetLimitWithManualSlippage = subtractBasisPointAmount(
    bn(minAmountOut).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
  assert(
    BigInt(finalAssetLimitWithManualSlippage) > 0n,
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
    finalAssetLimitWithManualSlippage,
  ].join(MEMO_PART_DELIMITER)

  return memo
}
