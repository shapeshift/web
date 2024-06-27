import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { queryClient } from 'context/QueryClientProvider/queryClient'

import type { EpochMetadata, PartialEpochMetadata } from '../types'
import { getAffiliateRevenueQueryFn, getAffiliateRevenueQueryKey } from './useAffiliateRevenueQuery'
import {
  getEarliestBlockNumberByTimestampQueryFn,
  getEarliestBlockNumberByTimestampQueryKey,
} from './useEarliestBlockNumberByTimestampQuery/useEarliestBlockNumberByTimestampQuery'

type EpochHistoryQueryKey = ['epochHistory']
type CurrentEpochMetadataQueryKey = ['currentEpochMetadata']

// TODO: Clean up by removing the Math.min after the first epoch starts.
// This is a temporary hack to ensure we have an epoch to test with prior to rFOX launch,
// and the correct one after launch (in case we don't action this todo it for any reason).
// const RFOX_FIRST_EPOCH_START_TIMESTAMP = BigInt(dayjs('2024-07-01T00:00:00Z').unix())
const RFOX_FIRST_EPOCH_START_TIMESTAMP = BigInt(
  Math.min(dayjs().startOf('month').unix(), dayjs('2024-07-01T00:00:00Z').unix()),
)

// This looks weird but isn't - "now" isn't now, it's "now" when this module was first evaluated
// This allows all calculations against now to be consistent, since our current monkey patch subtracts 2 epochs (60 days) from the same "now"
export const now = dayjs().unix()

// The query key excludes the current timestamp so we don't inadvertently end up with stupid things like reactively fetching every second etc.
// Instead we will rely on staleTime to refetch at a sensible interval.
export const getEpochHistoryQueryKey = (): EpochHistoryQueryKey => ['epochHistory']

export const fetchEpochHistory = async (): Promise<EpochMetadata[]> => {
  let startTimestamp = RFOX_FIRST_EPOCH_START_TIMESTAMP

  // using queryClient.fetchQuery here is ok because block timestamps do not change so reactivity is not needed
  let startBlockNumber = await queryClient.fetchQuery({
    queryKey: getEarliestBlockNumberByTimestampQueryKey({ targetTimestamp: startTimestamp }),
    queryFn: getEarliestBlockNumberByTimestampQueryFn({ targetTimestamp: startTimestamp }),
  })

  const epochHistory = []

  while (startTimestamp < now) {
    const nextStartTimestamp = BigInt(
      dayjs.unix(Number(startTimestamp)).add(1, 'month').startOf('month').unix(),
    )
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

export const getCurrentEpochMetadataQueryKey = (): CurrentEpochMetadataQueryKey => [
  'currentEpochMetadata',
]

export const fetchCurrentEpochMetadata = async (): Promise<PartialEpochMetadata> => {
  // Knowing that an epoch starts at the beginning of each calendar month makes things easy - current epoch
  // starts at the beginning of the current month and ends at the end of it
  const currentEpochStart = dayjs().startOf('month')
  const currentEpochStartTimestamp = BigInt(currentEpochStart.unix())

  const currentEpochStartBlockNumber = await queryClient.fetchQuery({
    queryKey: getEarliestBlockNumberByTimestampQueryKey({
      targetTimestamp: currentEpochStartTimestamp,
    }),
    queryFn: getEarliestBlockNumberByTimestampQueryFn({
      targetTimestamp: currentEpochStartTimestamp,
    }),
  })

  // And same here - last second of the month is the end of the epoch
  const currentEpochEndTimestamp = BigInt(dayjs(currentEpochStart).endOf('month').unix())

  const distributionAmountRuneBaseUnit = await queryClient.fetchQuery({
    queryKey: getAffiliateRevenueQueryKey({
      startTimestamp: currentEpochStartTimestamp,
      endTimestamp: currentEpochEndTimestamp,
    }),
    queryFn: getAffiliateRevenueQueryFn({
      startTimestamp: currentEpochStartTimestamp,
      endTimestamp: currentEpochEndTimestamp,
    }),
  })

  return {
    startBlockNumber: currentEpochStartBlockNumber,
    endBlockNumber: undefined,
    startTimestamp: currentEpochStartTimestamp,
    endTimestamp: currentEpochEndTimestamp,
    distributionAmountRuneBaseUnit,
  }
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
