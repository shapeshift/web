import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'

type BlockNumberByTimestampQueryKey = ['blockNumberByTimestamp', { targetTimestamp: bigint }]

/**
 * @param targetTimestamp The target timestamp in seconds - not required to be an actual block timestamp
 */
type UseBlockNumberByTimestampQueryProps = {
  targetTimestamp: bigint
}

export const getBlockNumberByTimestampQueryKey = ({
  targetTimestamp,
}: UseBlockNumberByTimestampQueryProps): BlockNumberByTimestampQueryKey => [
  'blockNumberByTimestamp',
  { targetTimestamp },
]

export const getBlockNumberByTimestampQueryFn =
  ({ targetTimestamp }: UseBlockNumberByTimestampQueryProps) =>
  async () => {
    const apiKey = getConfig().REACT_APP_ETHERSCAN_API_KEY
    const url = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${targetTimestamp}&closest=before&apikey=${apiKey}`
    const {
      data: { status, message, result },
    } = await axios.get<{ status: 0 | 1; message: string; result: string }>(url)

    const parsedBlockNumber = parseInt(result)

    if (isNaN(parsedBlockNumber)) {
      console.error({ status, message, result })
      throw Error('Error fetching from etherscan')
    }

    return BigInt(parsedBlockNumber)
  }

export const useBlockNumberByTimestampQuery = ({
  targetTimestamp,
}: UseBlockNumberByTimestampQueryProps) => {
  const queryKey: BlockNumberByTimestampQueryKey = useMemo(
    () => getBlockNumberByTimestampQueryKey({ targetTimestamp }),
    [targetTimestamp],
  )

  const queryFn = useMemo(
    () => getBlockNumberByTimestampQueryFn({ targetTimestamp }),
    [targetTimestamp],
  )

  const query = useQuery({
    queryKey,
    queryFn,
  })

  return query
}
