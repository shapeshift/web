import type { SwapperName } from '@shapeshiftoss/swapper'
import { swappers } from '@shapeshiftoss/swapper'

import type { StoredQuote } from './quoteStore'

export const isExternalPaymentSwapper = (swapperName: string): boolean =>
  swappers[swapperName as SwapperName]?.supportsExternalPayment === true

// Gated on capability, so a wallet swap that never bound its hash keeps erroring
export const requiresTxHashToTrack = (storedQuote: StoredQuote): boolean =>
  !storedQuote.txHash && !isExternalPaymentSwapper(storedQuote.swapperName)

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
