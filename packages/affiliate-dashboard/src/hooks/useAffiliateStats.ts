import { useCallback, useRef, useState } from 'react'

const API_BASE_URL = '/v1/affiliate/stats'

export interface AffiliateStats {
  totalSwaps: number
  totalVolumeUsd: number
  totalFeesUsd: number
}

// Raw API response shape (strings from backend)
interface ApiResponse {
  totalSwaps: number
  totalVolumeUsd: string
  totalFeesEarnedUsd: string
}

interface AffiliateStatsState {
  stats: AffiliateStats | null
  isLoading: boolean
  error: string | null
}

interface FetchOptions {
  startDate?: string
  endDate?: string
}

interface UseAffiliateStatsReturn extends AffiliateStatsState {
  fetchStats: (address: string, options?: FetchOptions) => Promise<void>
}

export const useAffiliateStats = (): UseAffiliateStatsReturn => {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchStats = useCallback(async (address: string, options?: FetchOptions): Promise<void> => {
    const requestId = ++requestIdRef.current
    if (!address.trim()) {
      setError('Please enter a valid affiliate address.')
      return
    }

    setIsLoading(true)
    setError(null)
    setStats(null)

    try {
      const params = new URLSearchParams({ address })
      if (options?.startDate) params.append('startDate', options.startDate)
      if (options?.endDate) params.append('endDate', options.endDate)

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
      setStats({
        totalSwaps: data.totalSwaps,
        totalVolumeUsd: parseFloat(data.totalVolumeUsd) || 0,
        totalFeesUsd: parseFloat(data.totalFeesEarnedUsd) || 0,
      })
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to fetch affiliate stats.'
      setError(message)
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  return { stats, isLoading, error, fetchStats }
}
