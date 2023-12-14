import type { AssetId } from '@shapeshiftoss/caip'

import type { SwapErrorRight } from './types'
import { SwapErrorType } from './types'

export const makeSwapErrorRight = ({
  details,
  cause,
  code,
  message,
}: {
  message: string
  details?: unknown
  cause?: unknown
  code?: SwapErrorType
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
    code: SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL,
    message: 'Sell amount is too small',
    details,
  })
