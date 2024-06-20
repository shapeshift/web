import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useQuery } from 'wagmi/query'
import { queryClient } from 'context/QueryClientProvider/queryClient'

import type { EpochMetadata } from '../types'
import { getAffiliateRevenueQueryFn, getAffiliateRevenueQueryKey } from './useAffiliateRevenueQuery'
import {
  getBlockNumberByTimestampQueryFn,
  getBlockNumberByTimestampQueryKey,
} from './useBlockNumberByTimestampQuery'

type EpochHistoryQueryKey = ['epochHistory']

const RFOX_FIRST_EPOCH_START_TIMESTAMP = BigInt(dayjs('2024-07-01T00:00:00Z').unix())

// The query key excludes the current timestamp so we don't inadvertently end up with stupid things like reactively fetching every second etc.
// Instead we will rely on staleTime to refetch at a sensible interval.
export const getEpochHistoryQueryKey = (): EpochHistoryQueryKey => ['epochHistory']

export const epochHistoryQueryFn = async (): Promise<EpochMetadata[]> => {
  const now = dayjs().unix()
  let startTimestamp = RFOX_FIRST_EPOCH_START_TIMESTAMP

  // using queryClient.fetchQuery here is ok because block timestamps do not change so reactivity is not needed
  let startBlockNumber = await queryClient.fetchQuery({
    queryKey: getBlockNumberByTimestampQueryKey({ targetTimestamp: startTimestamp }),
    queryFn: getBlockNumberByTimestampQueryFn({ targetTimestamp: startTimestamp }),
  })

  const epochHistory = []

  while (startTimestamp < now) {
    const nextStartTimestamp = BigInt(dayjs.unix(Number(startTimestamp)).add(1, 'month').unix())

    // using queryClient.fetchQuery here is ok because block timestamps do not change so reactivity is not needed
    const nextBlockNumber = await queryClient.fetchQuery({
      queryKey: getBlockNumberByTimestampQueryKey({ targetTimestamp: nextStartTimestamp }),
      queryFn: getBlockNumberByTimestampQueryFn({ targetTimestamp: nextStartTimestamp }),
    })

    const endTimestamp = nextStartTimestamp - 1n

    // using queryClient.fetchQuery here is ok because block timestamps do not change so reactivity is not needed
    const distributionAmountRuneBaseUnit = await queryClient.fetchQuery({
      queryKey: getAffiliateRevenueQueryKey({ startTimestamp, endTimestamp }),
      queryFn: getAffiliateRevenueQueryFn({ startTimestamp, endTimestamp }),
    })

    const epochMetadata = {
      startBlockNumber,
      endBlockNumber: nextBlockNumber - 1n,
      startTimestamp,
      endTimestamp,
      distributionAmountRuneBaseUnit,
    }

    epochHistory.push(epochMetadata)

    startTimestamp = nextStartTimestamp
    startBlockNumber = nextBlockNumber
  }

  return epochHistory
}

export const useEpochHistoryQuery = () => {
  // This pattern looks weird but it allows us to add parameters to the query and key later without bigger refactor
  const queryKey = useMemo(() => getEpochHistoryQueryKey(), [])

  const query = useQuery({
    queryKey,
    queryFn: epochHistoryQueryFn,
    staleTime: 60 * 60 * 1000, // 1 hour in milliseconds
  })

  return query
}
