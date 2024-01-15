import type { AssetId } from '@shapeshiftoss/caip'

import type { SwapErrorRight } from './types'
import { TradeQuoteError } from './types'

export const makeSwapErrorRight = ({
  details,
  cause,
  code,
  message,
}: {
  message: string
  details?: unknown
  cause?: unknown
  code?: TradeQuoteError
}): SwapErrorRight => ({
  name: 'SwapError',
  message,
  details,
  cause,
  code,
})

export const createTradeAmountTooSmallErr = (details?: {
  minAmountCryptoBaseUnit: string
  assetId: AssetId
}) =>
  makeSwapErrorRight({
    code: TradeQuoteError.SellAmountBelowMinimum,
    message: 'Sell amount is too small',
    details,
  })
