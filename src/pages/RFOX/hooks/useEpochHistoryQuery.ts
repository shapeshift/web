import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { queryClient } from 'context/QueryClientProvider/queryClient'

import type { EpochMetadata } from '../types'
import { getAffiliateRevenueQueryFn, getAffiliateRevenueQueryKey } from './useAffiliateRevenueQuery'
import {
  getEarliestBlockNumberByTimestampQueryFn,
  getEarliestBlockNumberByTimestampQueryKey,
} from './useEarliestBlockNumberByTimestampQuery/useEarliestBlockNumberByTimestampQuery'

type EpochHistoryQueryKey = ['epochHistory']

// TODO(gomes): revert me -  this obviously won't work until first rewards epoch start
// const RFOX_FIRST_EPOCH_START_TIMESTAMP = BigInt(dayjs('2024-07-01T00:00:00Z').unix())
const RFOX_FIRST_EPOCH_START_TIMESTAMP = BigInt(dayjs().subtract(1, 'month').unix())

// The query key excludes the current timestamp so we don't inadvertently end up with stupid things like reactively fetching every second etc.
// Instead we will rely on staleTime to refetch at a sensible interval.
export const getEpochHistoryQueryKey = (): EpochHistoryQueryKey => ['epochHistory']

export const fetchEpochHistory = async (): Promise<EpochMetadata[]> => {
  const now = dayjs().unix()
  let startTimestamp = RFOX_FIRST_EPOCH_START_TIMESTAMP

  // using queryClient.fetchQuery here is ok because block timestamps do not change so reactivity is not needed
  let startBlockNumber = await queryClient.fetchQuery({
    queryKey: getEarliestBlockNumberByTimestampQueryKey({ targetTimestamp: startTimestamp }),
    queryFn: getEarliestBlockNumberByTimestampQueryFn({ targetTimestamp: startTimestamp }),
  })

  const epochHistory = []

  while (startTimestamp < now) {
    const nextStartTimestamp = BigInt(dayjs.unix(Number(startTimestamp)).add(1, 'month').unix())
    startTimestamp = nextStartTimestamp

    if (nextStartTimestamp > now) {
      // Cannot introspect block numbers by timestamp for the future
      break
    }
    // using queryClient.fetchQuery here is ok because block timestamps do not change so reactivity is not needed
    const nextBlockNumber = await queryClient.fetchQuery({
      queryKey: getEarliestBlockNumberByTimestampQueryKey({ targetTimestamp: nextStartTimestamp }),
      queryFn: getEarliestBlockNumberByTimestampQueryFn({ targetTimestamp: nextStartTimestamp }),
    })
    startBlockNumber = nextBlockNumber

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
  }

  return epochHistory
}

export const useEpochHistoryQuery = () => {
  // This pattern looks weird but it allows us to add parameters to the query and key later without bigger refactor
  const queryKey = useMemo(() => getEpochHistoryQueryKey(), [])

  const query = useQuery({
    queryKey,
    queryFn: fetchEpochHistory,
    staleTime: 60 * 60 * 1000, // 1 hour in milliseconds
  })

  return query
}
