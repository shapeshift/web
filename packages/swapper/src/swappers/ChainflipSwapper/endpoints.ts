import type { Result } from '@sniptt/monads/build'

import { TxStatus } from '@shapeshiftoss/unchained-client';
import type { InterpolationOptions } from 'node-polyglot';

import type {
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
} from '../../types'

import { getChainflipTradeQuote } from './getChainflipTradeQuote/getTradeQuote'

export const chainflipApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    return await getChainflipTradeQuote(
        input,
        deps,
    )
  },

  // @ts-ignore
  checkTradeStatus: async (input): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    // TODO: Implement
    return {
      buyTxHash: undefined,
      status: TxStatus.Unknown,
      message: undefined,
    }
  }
}
