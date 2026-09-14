import type { SwapperName } from '@shapeshiftoss/swapper'
import { swappers } from '@shapeshiftoss/swapper'

import type { StoredQuote } from './quoteStore'

export const isExternalPaymentSwapper = (swapperName: string): boolean =>
  swappers[swapperName as SwapperName]?.supportsExternalPayment === true

export const requiresTxHashToTrack = (storedQuote: StoredQuote): boolean =>
  !storedQuote.txHash && !storedQuote.depositAddress
