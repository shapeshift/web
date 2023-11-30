import type { ChainId } from '@shapeshiftoss/caip'
import { BigNumber, bn } from 'lib/bignumber/bignumber'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { LIMIT_PART_DELIMITER, MEMO_PART_DELIMITER } from './constants'
import { assertIsValidMemo } from './makeSwapMemo/assertIsValidMemo'

export const addSlippageToMemo = ({
  expectedAmountOutThorBaseUnit,
  affiliateFeesThorBaseUnit,
  quotedMemo,
  slippageBps,
  isStreaming,
  chainId,
  affiliateBps,
  streamingInterval,
  // Our own default streaming quantity, currently sitting at 0 (i.e let the network decide)
  defaultStreamingQuantity,
  streamingQuantity,
}: {
  expectedAmountOutThorBaseUnit: string
  affiliateFeesThorBaseUnit: string
  quotedMemo: string | undefined
  slippageBps: BigNumber.Value
  chainId: ChainId
  affiliateBps: string
  isStreaming: boolean
  streamingInterval: number
  defaultStreamingQuantity: number
  streamingQuantity: number
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  // If the network returns 0 as a streaming quantity, use that - else, use the optimized max_streaming_quantity
  const optimizedStreamingQuantity = bn(streamingQuantity).gt(defaultStreamingQuantity)
    ? streamingQuantity
    : defaultStreamingQuantity

  // the missing element is the original limit with (optional, missing) streaming parameters
  const [prefix, pool, address, , affiliate, memoAffiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const limitWithManualSlippage = subtractBasisPointAmount(
    bn(expectedAmountOutThorBaseUnit)
      .minus(affiliateFeesThorBaseUnit)
      .toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const updatedLimitComponent = isStreaming
    ? [limitWithManualSlippage, streamingInterval, optimizedStreamingQuantity].join(
        LIMIT_PART_DELIMITER,
      )
    : [limitWithManualSlippage]

  const memo = [prefix, pool, address, updatedLimitComponent, affiliate, memoAffiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo, chainId, affiliateBps)
  return memo
}
