import type { ChainId } from '@shapeshiftoss/caip'
import { BigNumber } from 'lib/bignumber/bignumber'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import type { ThornodeQuoteResponseSuccess } from '../types'
import {
  DEFAULT_STREAMING_INTERVAL,
  DEFAULT_STREAMING_NUM_SWAPS,
  LIMIT_PART_DELIMITER,
  MEMO_PART_DELIMITER,
} from './constants'
import { assertIsValidMemo } from './makeSwapMemo/assertIsValidMemo'

export const addSlippageToMemo = (
  {
    memo: quotedMemo,
    expected_amount_out: expectedAmountOut,
    expected_amount_out_streaming: expectedAmountOutStreaming,
  }: ThornodeQuoteResponseSuccess,
  slippageBps: BigNumber.Value,
  isStreaming: boolean,
  chainId: ChainId,
) => {
  // the missing element is the original limit with (optional, missing) streaming parameters
  const [prefix, pool, address, , affiliate, affiliateBps] = quotedMemo.split(MEMO_PART_DELIMITER)

  const limitWithManualSlippage = subtractBasisPointAmount(
    isStreaming ? expectedAmountOutStreaming : expectedAmountOut,
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const updatedLimitComponent = isStreaming
    ? [limitWithManualSlippage, DEFAULT_STREAMING_INTERVAL, DEFAULT_STREAMING_NUM_SWAPS].join(
        LIMIT_PART_DELIMITER,
      )
    : [limitWithManualSlippage]

  const memo = [prefix, pool, address, updatedLimitComponent, affiliate, affiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo, chainId)
  return memo
}
