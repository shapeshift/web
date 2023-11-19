import type { ChainId } from '@shapeshiftoss/caip'
import { BigNumber, bn } from 'lib/bignumber/bignumber'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { DEFAULT_STREAMING_NUM_SWAPS, LIMIT_PART_DELIMITER, MEMO_PART_DELIMITER } from './constants'
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
}: {
  expectedAmountOutThorBaseUnit: string
  affiliateFeesThorBaseUnit: string
  quotedMemo: string | undefined
  slippageBps: BigNumber.Value
  chainId: ChainId
  affiliateBps: string
  isStreaming: boolean
  streamingInterval: number
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

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
    ? [limitWithManualSlippage, streamingInterval, DEFAULT_STREAMING_NUM_SWAPS].join(
        LIMIT_PART_DELIMITER,
      )
    : [limitWithManualSlippage]

  const memo = [prefix, pool, address, updatedLimitComponent, affiliate, memoAffiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo, chainId, affiliateBps)
  return memo
}
