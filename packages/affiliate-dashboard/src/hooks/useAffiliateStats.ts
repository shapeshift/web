import { useCallback, useState } from 'react'

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

  const fetchStats = useCallback(async (address: string, options?: FetchOptions): Promise<void> => {
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
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Request failed (${String(response.status)}): ${errorText}`)
      }

      const data = (await response.json()) as ApiResponse
      setStats({
        totalSwaps: data.totalSwaps,
        totalVolumeUsd: parseFloat(data.totalVolumeUsd) || 0,
        totalFeesUsd: parseFloat(data.totalFeesEarnedUsd) || 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch affiliate stats.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { stats, isLoading, error, fetchStats }
}
