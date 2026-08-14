import type { SwapperName } from '@shapeshiftoss/swapper'
import { swappers } from '@shapeshiftoss/swapper'

import type { StoredQuote } from './quoteStore'

// Advisory, for the rates response - a swapper that can be paid externally may still return a
// route that cannot be, so only the quote is authoritative
export const isExternalPaymentSwapper = (swapperName: string): boolean =>
  swappers[swapperName as SwapperName]?.supportsExternalPayment === true

// Gated on the quote's own address rather than the swapper's capability: a memo-bound route from
// an externally payable swapper still has to be signed, and must keep erroring without its hash
export const requiresTxHashToTrack = (storedQuote: StoredQuote): boolean =>
  !storedQuote.txHash && !storedQuote.depositAddress

export const bindSellTxHash = (
  storedQuote: StoredQuote,
  sellTxHash: string,
  now: number,
): StoredQuote => ({
  ...storedQuote,
  txHash: sellTxHash,
  registeredAt: storedQuote.registeredAt ?? now,
  status: 'submitted',
})
