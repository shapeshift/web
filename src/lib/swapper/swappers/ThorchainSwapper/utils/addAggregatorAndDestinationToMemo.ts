import type { Address } from 'viem'

import { MEMO_PART_DELIMITER } from './constants'

export const addAggregatorAndDestinationToMemo = ({
  quotedMemo,
  aggregator,
  destinationToken,
  minAmountOut,
}: {
  quotedMemo: string | undefined
  aggregator: Address
  destinationToken: Address
  minAmountOut: string
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  const [prefix, pool, address, limitWithManualSlippage, affiliate, memoAffiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const memo = [
    prefix,
    pool,
    address,
    limitWithManualSlippage,
    affiliate,
    memoAffiliateBps,
    aggregator,
    destinationToken,
    minAmountOut,
  ].join(MEMO_PART_DELIMITER)

  return memo
}
