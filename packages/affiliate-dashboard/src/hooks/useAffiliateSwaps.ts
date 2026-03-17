import { useCallback, useRef, useState } from 'react'

const API_BASE_URL = '/v1/affiliate/swaps'

export interface AffiliateSwap {
  id: string
  sellAsset: string | { symbol?: string; name?: string }
  buyAsset: string | { symbol?: string; name?: string }
  sellAmount: string
  buyAmount: string
  sellAmountUsd: string
  buyAmountUsd: string
  affiliateBps: string
  affiliateFeeUsd: string
  status: string
  createdAt: string
}

interface ApiResponse {
  swaps: AffiliateSwap[]
  total: number
  limit: number
  offset: number
}

interface AffiliateSwapsState {
  swaps: AffiliateSwap[]
  total: number
  isLoading: boolean
  error: string | null
}

interface FetchOptions {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

interface UseAffiliateSwapsReturn extends AffiliateSwapsState {
  fetchSwaps: (address: string, options?: FetchOptions) => Promise<void>
}

export const useAffiliateSwaps = (): UseAffiliateSwapsReturn => {
  const [swaps, setSwaps] = useState<AffiliateSwap[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchSwaps = useCallback(async (address: string, options?: FetchOptions): Promise<void> => {
    const requestId = ++requestIdRef.current
    if (!address.trim()) {
      setError('Please enter a valid affiliate address.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ address })
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)
      if (options?.limit) params.append('limit', String(options.limit))
      if (options?.offset) params.append('offset', String(options.offset))

      const response = await fetch(`${API_BASE_URL}?${params.toString()}`)

      if (!response.ok) {
        let errorMessage = `Request failed (${String(response.status)})`
        try {
          const errorBody = (await response.json()) as {
            error?: string
            details?: { message: string }[]
          }
          if (errorBody.error) {
            errorMessage = errorBody.error
          }
          if (errorBody.details?.[0]?.message) {
            errorMessage = errorBody.details[0].message
          }
        } catch {
          // Response wasn't JSON, use generic message
        }
        throw new Error(errorMessage)
      }

      const data = (await response.json()) as ApiResponse
      if (requestId !== requestIdRef.current) return
      setSwaps(data.swaps)
      setTotal(data.total)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to fetch affiliate swaps.'
      setError(message)
      setSwaps([])
      setTotal(0)
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  return { swaps, total, isLoading, error, fetchSwaps }
}
