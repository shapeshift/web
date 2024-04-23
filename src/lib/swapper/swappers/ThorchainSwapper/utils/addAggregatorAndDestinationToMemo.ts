import assert from 'assert'
import type { Address } from 'viem'

import { MEMO_PART_DELIMITER } from './constants'

export const addAggregatorAndDestinationToMemo = ({
  quotedMemo,
  aggregator,
  finalAssetAddress,
  minAmountOut,
}: {
  quotedMemo: string | undefined
  aggregator: Address
  finalAssetAddress: Address
  minAmountOut: string
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  const [prefix, pool, address, limitWithManualSlippage, affiliate, affiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
  assert(BigInt(minAmountOut) > 0n, 'expected expectedAmountOut to be a positive amount')

  // Thorchain memo format:
  // SWAP:ASSET:DESTADDR:LIM:AFFILIATE:FEE:DEX Aggregator Addr:Final Asset Addr:MinAmountOut
  // see https://gitlab.com/thorchain/thornode/-/merge_requests/2218 for reference
  const memo = [
    prefix,
    pool,
    address,
    limitWithManualSlippage,
    affiliate,
    affiliateBps,
    aggregator,
    finalAssetAddress,
    minAmountOut,
  ].join(MEMO_PART_DELIMITER)

  return memo
}
