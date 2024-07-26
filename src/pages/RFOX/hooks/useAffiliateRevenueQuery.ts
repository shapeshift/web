import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'

type AffiliateRevenueQueryKey = [
  'affiliateRevenue',
  { startTimestamp?: number; endTimestamp?: number },
]

type TotalRevenue = bigint

type UseAffiliateRevenueQueryProps<SelectData = TotalRevenue> = {
  startTimestamp?: number
  endTimestamp?: number
  select?: (totalStaked: bigint) => SelectData
}

export const getAffiliateRevenueQueryKey = ({
  startTimestamp,
  endTimestamp,
}: UseAffiliateRevenueQueryProps): AffiliateRevenueQueryKey => [
  'affiliateRevenue',
  { startTimestamp, endTimestamp },
]

export const getAffiliateRevenueQueryFn = ({
  startTimestamp,
  endTimestamp,
}: UseAffiliateRevenueQueryProps) => {
  if (!startTimestamp || !endTimestamp) return skipToken

  return async () => {
    const baseUrl = getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL

    const url = `${baseUrl}/api/v1/affiliate/revenue?start=${startTimestamp}&end=${endTimestamp}`
    const { data } = await axios.get<{ address: string; amount: string }>(url)

    try {
      return BigInt(data.amount)
    } catch (error) {
      console.error({ data })
      throw Error('Error parsing affiliate revenue')
    }
  }
}

export const useAffiliateRevenueQuery = <SelectData = TotalRevenue>({
  startTimestamp,
  endTimestamp,
  select,
}: UseAffiliateRevenueQueryProps<SelectData>) => {
  const queryKey: AffiliateRevenueQueryKey = useMemo(() => {
    return getAffiliateRevenueQueryKey({ startTimestamp, endTimestamp })
  }, [startTimestamp, endTimestamp])

  const queryFn = useMemo(() => {
    return getAffiliateRevenueQueryFn({ startTimestamp, endTimestamp })
  }, [startTimestamp, endTimestamp])

  const query = useQuery({
    queryKey,
    queryFn,
    select,
  })

  return query
}
