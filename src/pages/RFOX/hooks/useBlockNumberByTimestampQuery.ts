import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useQuery } from 'wagmi/query'

type BlockNumberByTimestampQueryKey = ['blockNumberByTimestamp', { targetTimestamp: bigint }]

type UseBlockNumberByTimestampQueryProps = {
  targetTimestamp: bigint
}

export const getBlockNumberByTimestampQueryKey = (
  targetTimestamp: bigint,
): BlockNumberByTimestampQueryKey => ['blockNumberByTimestamp', { targetTimestamp }]

export const blockNumberByTimestampQueryFn = async ({
  queryKey,
}: {
  queryKey: BlockNumberByTimestampQueryKey
}) => {
  const [, { targetTimestamp }] = queryKey

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
    () => getBlockNumberByTimestampQueryKey(targetTimestamp),
    [targetTimestamp],
  )

  const query = useQuery({
    queryKey,
    queryFn: blockNumberByTimestampQueryFn,
  })

  return query
}
