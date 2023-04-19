import type { ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { BuildTradeInput, SwapErrorRight } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { getTradeQuote } from 'lib/swapper/LifiSwapper/getTradeQuote/getTradeQuote'
import { isGetEvmTradeQuoteInput } from 'lib/swapper/LifiSwapper/utils/isGetEvmTradeQuoteInput/isGetEvmTradeQuoteInput'

import type { LifiTrade } from '../utils/types'

export const buildTrade = async (
  input: BuildTradeInput,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTrade, SwapErrorRight>> => {
  if (!isGetEvmTradeQuoteInput(input)) {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade] - only EVM chains are supported',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: input,
      }),
    )
  }

  // TODO: determine whether we should be fetching another quote like below or modify `executeTrade.ts`
  // to allow passing the existing quote in.
  return (await getTradeQuote(input, lifiChainMap)).map(tradeQuote => ({
    ...tradeQuote,
    receiveAddress: input.receiveAddress,
  }))
}
