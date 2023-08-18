import { BigNumber } from 'lib/bignumber/bignumber'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import type { ThornodeQuoteResponseSuccess } from '../types'
import {
  DEFAULT_STREAMING_NUM_BLOCKS,
  DEFAULT_STREAMING_NUM_SWAPS,
  LIMIT_PART_DELIMITER,
  MEMO_PART_DELIMITER,
} from './constants'
import { assertIsValidMemo } from './makeSwapMemo/assertIsValidMemo'

export const addSlippageToMemo = (
  { memo: quotedMemo, expected_amount_out: expectedAmountOut }: ThornodeQuoteResponseSuccess,
  slippageBps: BigNumber.Value,
  isStreaming: boolean,
) => {
  // the missing element is the original limit with (optional, missing) streaming parameters
  const [prefix, pool, address, , affiliate, affiliateBps] = quotedMemo.split(MEMO_PART_DELIMITER)

  const limitWithManualSlippage = subtractBasisPointAmount(
    expectedAmountOut,
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const updatedLimitComponent = isStreaming
    ? [limitWithManualSlippage, DEFAULT_STREAMING_NUM_SWAPS, DEFAULT_STREAMING_NUM_BLOCKS].join(
        LIMIT_PART_DELIMITER,
      )
    : [limitWithManualSlippage]

  const memo = [prefix, pool, address, updatedLimitComponent, affiliate, affiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo)
  return memo
}
