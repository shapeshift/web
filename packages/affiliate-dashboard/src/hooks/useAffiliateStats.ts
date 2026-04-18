import type { UseQueryResult } from '@tanstack/react-query'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { parseResponse } from '../lib/api'
import type { Period } from '../lib/periods'

const AFFILIATE_STATS_URL = `${import.meta.env.VITE_API_URL}/v1/affiliate/stats`

export interface AffiliateStats {
  totalSwaps: number
  totalVolumeUsd: number
  totalFeesUsd: number
}

const ApiResponseSchema = z.object({
  totalSwaps: z.number(),
  totalVolumeUsd: z.string(),
  totalFeesEarnedUsd: z.string(),
})

const fetchStats = async (address: string, period: Period): Promise<AffiliateStats> => {
  const params = new URLSearchParams({ address })

  if (period.startDate) params.append('startDate', period.startDate)
  if (period.endDate) params.append('endDate', period.endDate)

  const response = await fetch(`${AFFILIATE_STATS_URL}?${params.toString()}`)
  const data = await parseResponse(response, ApiResponseSchema)

  return {
    totalSwaps: data.totalSwaps,
    totalVolumeUsd: parseFloat(data.totalVolumeUsd) || 0,
    totalFeesUsd: parseFloat(data.totalFeesEarnedUsd) || 0,
  }
}

export const useAffiliateStats = (
  address: string,
  period: Period,
): UseQueryResult<AffiliateStats, Error> =>
  useQuery({
    queryKey: ['affiliate', 'stats', address, period.startDate, period.endDate],
    queryFn: () => fetchStats(address, period),
    enabled: Boolean(address),
    placeholderData: keepPreviousData,
  })
