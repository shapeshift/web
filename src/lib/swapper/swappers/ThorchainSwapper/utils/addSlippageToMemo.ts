import type { ChainId } from '@shapeshiftoss/caip'
import { BigNumber, bn } from 'lib/bignumber/bignumber'
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { MEMO_PART_DELIMITER } from './constants'
import { assertIsValidMemo } from './makeSwapMemo/assertIsValidMemo'

export const addSlippageToMemo = ({
  expectedAmountOutThorBaseUnit,
  quotedMemo,
  slippageBps,
  isStreaming,
  chainId,
  affiliateBps,
}: {
  expectedAmountOutThorBaseUnit: string
  quotedMemo: string | undefined
  slippageBps: BigNumber.Value
  chainId: ChainId
  affiliateBps: string
  isStreaming: boolean
}) => {
  if (!quotedMemo) throw new Error('no memo provided')

  // always use TC auto stream quote (0 limit = 5bps - 50bps, sometimes up to 100bps)
  // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
  if (isStreaming) return quotedMemo

  // the missing element is the original limit with (optional, missing) streaming parameters
  const [prefix, pool, address, , affiliate, memoAffiliateBps] =
    quotedMemo.split(MEMO_PART_DELIMITER)

  const limitWithManualSlippage = subtractBasisPointAmount(
    bn(expectedAmountOutThorBaseUnit).toFixed(0, BigNumber.ROUND_DOWN),
    slippageBps,
    BigNumber.ROUND_DOWN,
  )

  // Thorchain memo format:
  // SWAP:ASSET:DESTADDR:LIM:AFFILIATE:FEE:DEX Aggregator Addr:Final Asset Addr:MinAmountOut
  // Dex aggregator address, final asset address and minAmountOut are optional
  // see https://gitlab.com/thorchain/thornode/-/merge_requests/2218 for reference
  const memo = [prefix, pool, address, limitWithManualSlippage, affiliate, memoAffiliateBps].join(
    MEMO_PART_DELIMITER,
  )

  assertIsValidMemo(memo, chainId, affiliateBps)
  return memo
}
