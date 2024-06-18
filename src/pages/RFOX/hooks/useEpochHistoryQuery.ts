import { useMemo } from 'react'
import { useQuery } from 'wagmi/query'

import type { EpochMetadata } from '../types'

type EpochHistoryQueryKey = ['epochHistory']

export const getEpochHistoryQueryKey = (): EpochHistoryQueryKey => ['epochHistory']

export const getEpochHistoryQueryFn =
  () =>
  (_: { queryKey: EpochHistoryQueryKey }): { data: EpochMetadata[] } => {
    // TODO: fetch the epoch info from our indexer
    return {
      data: [
        {
          startBlockNumber: 0n,
          endBlockNumber: 0n,
          startTimestamp: 0n,
          endTimestamp: 0n,
          distributionAmountRuneBaseUnit: 1234567890n,
        },
      ],
    }
  }

export const useEpochHistoryQuery = () => {
  // This pattern looks weird but it allows us to add parameters to the query and key later without bigger refactor
  const queryKey = useMemo(() => getEpochHistoryQueryKey(), [])
  const queryFn = useMemo(() => getEpochHistoryQueryFn(), [])

  const epochHistoryQuery = useQuery({
    queryKey,
    queryFn,
  })

  return epochHistoryQuery
}
