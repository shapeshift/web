import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useQuery } from 'wagmi/query'

type AffiliateRevenueQueryKey = [
  'affiliateRevenue',
  { startTimestamp: bigint; endTimestamp: bigint },
]

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
  { startTimestamp, endTimestamp },
]

export const getAffiliateRevenueQueryFn =
  ({ startTimestamp, endTimestamp }: UseAffiliateRevenueQueryProps) =>
  async () => {
    const baseUrl = getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL

    // The timestamps are in seconds, but the API expects milliseconds
    const url = `${baseUrl}/v1/affiliate/revenue?start=${startTimestamp * 1000n}&end=${
      endTimestamp * 1000n
    }`
    const {
      data: { address, amount },
    } = await axios.get<{ address: string; amount: string }>(url)

    try {
      // Parse string directly to BigInt.
      // This will throw if the string is not a valid number
      const parsedBlockNumber = BigInt(amount)
      return parsedBlockNumber
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
