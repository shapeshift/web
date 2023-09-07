import type { ChainId } from '@shapeshiftoss/caip'
import { BigNumber } from 'lib/bignumber/bignumber'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import {
  DEFAULT_STREAMING_INTERVAL,
  DEFAULT_STREAMING_NUM_SWAPS,
  LIMIT_PART_DELIMITER,
  MEMO_PART_DELIMITER,
} from './constants'
import { assertIsValidMemo } from './makeSwapMemo/assertIsValidMemo'

export const addSlippageToMemo = (
  expectedAmountOutThorBaseUnit: string,
  quotedMemo: string | undefined,
  slippageBps: BigNumber.Value,
  isStreaming: boolean,
  chainId: ChainId,
  affiliateBps: string,
) => {
  if (!quotedMemo) throw new Error('no memo provided')

  // the missing element is the original limit with (optional, missing) streaming parameters
  const [prefix, pool, address, , affiliate, memoAffiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const limitWithManualSlippage = subtractBasisPointAmount(
    expectedAmountOutThorBaseUnit,
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const updatedLimitComponent = isStreaming
    ? [limitWithManualSlippage, DEFAULT_STREAMING_INTERVAL, DEFAULT_STREAMING_NUM_SWAPS].join(
        LIMIT_PART_DELIMITER,
      )
    : [limitWithManualSlippage]

  const memo = [prefix, pool, address, updatedLimitComponent, affiliate, memoAffiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo, chainId, affiliateBps)
  return memo
}
