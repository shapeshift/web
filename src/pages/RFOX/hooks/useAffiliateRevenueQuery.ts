import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { serialize } from 'wagmi'

type AffiliateRevenueQueryKey = ['affiliateRevenue', string]

/**
 * @param startTimestamp The start timestamp in seconds - not required to be an actual block timestamp
 * @param endTimestamp The end timestamp in seconds - not required to be an actual block timestamp
 */
type UseAffiliateRevenueQueryProps = {
  startTimestamp: bigint
  endTimestamp: bigint
}

export const getAffiliateRevenueQueryKey = ({
  startTimestamp,
  endTimestamp,
}: UseAffiliateRevenueQueryProps): AffiliateRevenueQueryKey => [
  'affiliateRevenue',
  serialize({ startTimestamp, endTimestamp }),
]

export const getAffiliateRevenueQueryFn =
  ({ startTimestamp, endTimestamp }: UseAffiliateRevenueQueryProps) =>
  async () => {
    const baseUrl = getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL

    // The timestamps are in seconds, but the API expects milliseconds
    const url = `${baseUrl}/api/v1/affiliate/revenue?start=${startTimestamp}&end=${endTimestamp}`
    const {
      data: { address, amount },
    } = await axios.get<{ address: string; amount: string }>(url)

    try {
      // Parse string directly to BigInt.
      // This will throw if the string is not a valid number
      const parsedRevenue = BigInt(amount)
      return parsedRevenue
    } catch (error) {
      console.error({ address, amount })
      throw Error('Error parsing affiliate revenue')
    }
  }

export const useAffiliateRevenueQuery = ({
  startTimestamp,
  endTimestamp,
}: UseAffiliateRevenueQueryProps) => {
  const queryKey: AffiliateRevenueQueryKey = useMemo(
    () => getAffiliateRevenueQueryKey({ startTimestamp, endTimestamp }),
    [startTimestamp, endTimestamp],
  )

  const queryFn = useMemo(
    () => getAffiliateRevenueQueryFn({ startTimestamp, endTimestamp }),
    [startTimestamp, endTimestamp],
  )

  const query = useQuery({
    queryKey,
    queryFn,
  })

  return query
}
