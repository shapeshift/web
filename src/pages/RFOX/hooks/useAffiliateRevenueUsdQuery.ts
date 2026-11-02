import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import { getConfig } from '@/config'

type AffiliateRevenueUsdQueryKey = [
  'affiliateRevenue',
  { startTimestamp?: number; endTimestamp?: number },
]

type TotalRevenueUsd = number

type UseAffiliateRevenueUsdQueryProps<SelectData = TotalRevenueUsd> = {
  startTimestamp?: number
  endTimestamp?: number
  select?: (totalRevenueUsd: number) => SelectData
}

export const getAffiliateRevenueUsdQueryKey = ({
  startTimestamp,
  endTimestamp,
}: UseAffiliateRevenueUsdQueryProps): AffiliateRevenueUsdQueryKey => [
  'affiliateRevenue',
  { startTimestamp, endTimestamp },
]

export const getAffiliateRevenueUsdQueryFn = ({
  startTimestamp,
  endTimestamp,
}: UseAffiliateRevenueUsdQueryProps) => {
  if (!startTimestamp || !endTimestamp) return skipToken

  return async () => {
    const baseUrl = getConfig().VITE_AFFILIATE_REVENUE_URL

    // Convert timestamps (in milliseconds) to YYYY-MM-DD format
    const startDate = new Date(startTimestamp).toISOString().split('T')[0]
    const endDate = new Date(endTimestamp).toISOString().split('T')[0]

    const url = `${baseUrl}/api/v1/affiliate/revenue?startDate=${startDate}&endDate=${endDate}`
    const { data } = await axios.get<{ totalUsd: number; failedProviders?: string[] }>(url, {
      timeout: 15_000,
    })

    if (typeof data.totalUsd !== 'number' || !Number.isFinite(data.totalUsd)) {
      throw new Error('Invalid affiliate revenue response')
    }

    if (data.failedProviders?.length) {
      throw new Error('Affiliate revenue is incomplete')
    }

    return data.totalUsd
  }
}

export const useAffiliateRevenueUsdQuery = <SelectData = TotalRevenueUsd>({
  startTimestamp,
  endTimestamp,
  select,
}: UseAffiliateRevenueUsdQueryProps<SelectData>) => {
  const queryKey: AffiliateRevenueUsdQueryKey = useMemo(() => {
    return getAffiliateRevenueUsdQueryKey({ startTimestamp, endTimestamp })
  }, [startTimestamp, endTimestamp])

  const queryFn = useMemo(() => {
    return getAffiliateRevenueUsdQueryFn({ startTimestamp, endTimestamp })
  }, [startTimestamp, endTimestamp])

  const query = useQuery({
    queryKey,
    queryFn,
    select,
    retry: 1,
  })

  return query
}
