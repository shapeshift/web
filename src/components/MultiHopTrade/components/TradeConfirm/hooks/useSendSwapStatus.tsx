import { useEffect, useState } from 'react'

import type { SendSwapQuoteStatus } from '@/lib/sendSwapApi'
import { sendSwapApi } from '@/lib/sendSwapApi'
import { QuoteStatus } from '@/state/slices/sendSwapSlice/types'

const POLL_INTERVAL_MS = 3000 // Poll every 3 seconds

export type UseSendSwapStatusArgs = {
  quoteId: string | undefined
  enabled?: boolean
}

export const useSendSwapStatus = ({ quoteId, enabled = true }: UseSendSwapStatusArgs) => {
  const [status, setStatus] = useState<SendSwapQuoteStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!quoteId || !enabled) return

    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const fetchStatus = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const data = await sendSwapApi.getQuoteStatus(quoteId)

        if (isMounted) {
          setStatus(data)
          setIsLoading(false)

          // Stop polling if swap is complete or failed
          const shouldStopPolling =
            data.status === QuoteStatus.COMPLETED ||
            data.status === QuoteStatus.FAILED ||
            data.isExpired

          if (!shouldStopPolling) {
            timeoutId = setTimeout(fetchStatus, POLL_INTERVAL_MS)
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsLoading(false)
          // Retry on error after interval
          timeoutId = setTimeout(fetchStatus, POLL_INTERVAL_MS)
        }
      }
    }

    fetchStatus()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [quoteId, enabled])

  return {
    status,
    isLoading,
    error,
    isComplete: status?.status === QuoteStatus.COMPLETED,
    isFailed: status?.status === QuoteStatus.FAILED,
    isExpired: status?.isExpired,
  }
}
