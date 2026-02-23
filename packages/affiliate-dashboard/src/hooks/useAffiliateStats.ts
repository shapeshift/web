import { useState, useCallback } from 'react'

const API_BASE_URL = '/v1/affiliate/stats'

interface AffiliateStats {
  totalSwaps: number
  totalVolumeUsd: number
  totalFeesUsd: number
}

interface AffiliateStatsState {
  stats: AffiliateStats | null
  isLoading: boolean
  error: string | null
}

interface UseAffiliateStatsReturn extends AffiliateStatsState {
  fetchStats: (address: string) => Promise<void>
}

export const useAffiliateStats = (): UseAffiliateStatsReturn => {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (address: string): Promise<void> => {
    if (!address.trim()) {
      setError('Please enter a valid affiliate address.')
      return
    }

    setIsLoading(true)
    setError(null)
    setStats(null)

    try {
      const response = await fetch(
        `${API_BASE_URL}?address=${encodeURIComponent(address)}`,
      )

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Request failed (${String(response.status)}): ${errorText}`,
        )
      }

      const data: AffiliateStats = await response.json()
      setStats(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch affiliate stats.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { stats, isLoading, error, fetchStats }
}
