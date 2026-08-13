import type { SwapperName } from '@shapeshiftoss/swapper'
import { swappers } from '@shapeshiftoss/swapper'

import type { StoredQuote } from './quoteStore'

export const isDepositAddressSwapper = (swapperName: string): boolean =>
  swappers[swapperName as SwapperName]?.supportsDepositAddress === true

// Gated on the swapper's capability, never on a missing hash - a wallet swap that failed to bind
// its hash must keep erroring rather than drifting into deposit-style tracking
export const requiresTxHashToTrack = (storedQuote: StoredQuote): boolean =>
  !storedQuote.txHash && !isDepositAddressSwapper(storedQuote.swapperName)

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
