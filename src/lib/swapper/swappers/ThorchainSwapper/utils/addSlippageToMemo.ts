import { BigNumber } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import type { ThornodeQuoteResponseSuccess } from '../types'
import { assertIsValidMemo } from './makeSwapMemo/assertIsValidMemo'

const MEMO_PART_DELIMITER = ':'
const STREAMING_DELIMITER = '/'

export const addSlippageToMemo = (
  { memo: quotedMemo, expected_amount_out: expectedAmountOut }: ThornodeQuoteResponseSuccess,
  slippageBps: BigNumber.Value,
) => {
  const [s, pool, address, originalLimitComponent, affiliate, affiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)
  // element 0 is the original limit value, which is undefined - we compute a new one
  const [, subSwaps, blocks] = originalLimitComponent.split(STREAMING_DELIMITER)

  const limitWithManualSlippage = subtractBasisPointAmount(
    expectedAmountOut,
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  const updatedLimitComponent = [limitWithManualSlippage, subSwaps, blocks]
    .filter(isSome) // filtering out streaming components if not present
    .join(STREAMING_DELIMITER)

  const memo = [s, pool, address, updatedLimitComponent, affiliate, affiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo)
  return memo
}
