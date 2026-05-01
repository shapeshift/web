import type { UseQueryResult } from '@tanstack/react-query'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { NumericString, parseResponse } from '../lib/api'
import { AFFILIATE_URL } from '../lib/constants'
import type { Period } from '../lib/periods'

const AFFILIATE_STATS_URL = `${AFFILIATE_URL}/stats`

export interface AffiliateStats {
  totalSwaps: number
  totalVolumeUsd: number
  totalFeesUsd: number
}

const ApiResponseSchema = z.object({
  totalSwaps: z.number(),
  totalVolumeUsd: NumericString,
  totalFeesEarnedUsd: NumericString,
})

const fetchStats = async (address: string, period: Period): Promise<AffiliateStats> => {
  const params = new URLSearchParams({ address })

  if (period.startDate) params.append('startDate', period.startDate)
  if (period.endDate) params.append('endDate', period.endDate)

  const response = await fetch(`${AFFILIATE_STATS_URL}?${params.toString()}`)
  const data = await parseResponse(response, ApiResponseSchema)

  return {
    totalSwaps: data.totalSwaps,
    totalVolumeUsd: data.totalVolumeUsd,
    totalFeesUsd: data.totalFeesEarnedUsd,
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
