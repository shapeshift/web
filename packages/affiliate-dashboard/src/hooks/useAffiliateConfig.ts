import { useCallback, useRef, useState } from 'react'

const API_BASE_URL = '/v1/affiliate'

export interface AffiliateConfig {
  id: string
  walletAddress: string
  partnerCode: string | null
  bps: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AffiliateConfigState {
  config: AffiliateConfig | null
  isLoading: boolean
  error: string | null
}

interface UseAffiliateConfigReturn extends AffiliateConfigState {
  fetchConfig: (address: string) => Promise<void>
}

export const useAffiliateConfig = (): UseAffiliateConfigReturn => {
  const [config, setConfig] = useState<AffiliateConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchConfig = useCallback(async (address: string): Promise<void> => {
    if (!address.trim()) return

    const currentRequestId = ++requestIdRef.current

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(address)}`)

      // Stale response guard — discard if a newer request was fired
      if (currentRequestId !== requestIdRef.current) return

      if (response.status === 404) {
        // Not registered - that's ok
        setConfig(null)
        return
      }

      if (!response.ok) {
        throw new Error(`Request failed (${String(response.status)})`)
      }

      const data = (await response.json()) as AffiliateConfig
      setConfig(data)
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to fetch affiliate config.'
      setError(message)
      setConfig(null)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  return { config, isLoading, error, fetchConfig }
}
