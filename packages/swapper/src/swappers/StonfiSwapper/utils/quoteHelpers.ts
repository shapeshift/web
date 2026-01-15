import type { Omniston, QuoteRequest, QuoteResponseEvent } from '@ston-fi/omniston-sdk'

import type { QuoteResult } from '../types'

export const waitForQuote = (
  omniston: Omniston,
  request: QuoteRequest,
  timeoutMs: number,
): Promise<QuoteResult> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      resolve({ type: 'timeout' })
    }, timeoutMs)

    const subscription = omniston.requestForQuote(request).subscribe({
      next: (event: QuoteResponseEvent) => {
        if (event.type === 'quoteUpdated' && event.quote) {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve({ type: 'success', quote: event.quote })
        } else if (event.type === 'noQuote') {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve({ type: 'noQuote' })
        }
      },
      error: err => {
        clearTimeout(timer)
        subscription.unsubscribe()
        resolve({ type: 'error', error: err })
      },
    })
  })
}
