import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useQuery } from 'wagmi/query'

type AffiliateRevenueQueryKey = [
  'affiliateRevenue',
  { startTimestamp: bigint; endTimestamp: bigint },
]

type UseAffiliateRevenueQueryProps = {
  startTimestamp: bigint
  endTimestamp: bigint
}

export const getAffiliateRevenueQueryKey = (
  startTimestamp: bigint,
  endTimestamp: bigint,
): AffiliateRevenueQueryKey => ['affiliateRevenue', { startTimestamp, endTimestamp }]

export const affiliateRevenueQueryFn = async ({
  queryKey,
}: {
  queryKey: AffiliateRevenueQueryKey
}) => {
  const [, { startTimestamp, endTimestamp }] = queryKey

  const baseUrl = getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL

  const url = `${baseUrl}/v1/affiliate/revenue?start=${startTimestamp}&end=${endTimestamp}`
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
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: AffiliateRevenueQueryKey = useMemo(
    () => getAffiliateRevenueQueryKey(startTimestamp, endTimestamp),
    [startTimestamp, endTimestamp],
  )

  const query = useQuery({
    queryKey,
    queryFn: affiliateRevenueQueryFn,
  })

  return query
}
