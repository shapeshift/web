import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { ZRC_PERMIT2_SOURCE_ID } from '@shapeshiftoss/swapper/dist/swappers/ZrxSwapper/utils/constants'

export const isPermit2Hop = (tradeQuoteStep: TradeQuoteStep | undefined) =>
  tradeQuoteStep?.source === ZRC_PERMIT2_SOURCE_ID
