import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { queryClient } from 'context/QueryClientProvider/queryClient'

import type { PartialEpochMetadata } from '../types'
import { getAffiliateRevenueQueryFn, getAffiliateRevenueQueryKey } from './useAffiliateRevenueQuery'
import {
  getEarliestBlockNumberByTimestampQueryFn,
  getEarliestBlockNumberByTimestampQueryKey,
} from './useEarliestBlockNumberByTimestampQuery/useEarliestBlockNumberByTimestampQuery'

type CurrentEpochMetadataQueryKey = ['currentEpochMetadata']

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
    staleTime: Infinity, // Block numbers don't change vs timestamp so we can cache this forever
  })

  // And same here - last second of the month is the end of the epoch
  const currentEpochEndTimestamp = BigInt(dayjs(currentEpochStart).endOf('month').unix())

  const affiliateRevenueRuneBaseUnit = await queryClient.fetchQuery({
    queryKey: getAffiliateRevenueQueryKey({
      startTimestamp: currentEpochStartTimestamp,
      endTimestamp: currentEpochEndTimestamp,
    }),
    queryFn: getAffiliateRevenueQueryFn({
      startTimestamp: currentEpochStartTimestamp,
      endTimestamp: currentEpochEndTimestamp,
    }),
  })

  // We distribute 25% of the affiliate revenue to the stakers, so divide by 4
  // https://snapshot.org/#/shapeshiftdao.eth/proposal/0x0bb84bdf838fb90da922ce62293336bf7c0c67a9a1d6fe451ffaa29284722f9f
  const distributionAmountRuneBaseUnit = affiliateRevenueRuneBaseUnit / 4n

  return {
    startBlockNumber: currentEpochStartBlockNumber,
    endBlockNumber: undefined,
    startTimestamp: currentEpochStartTimestamp,
    endTimestamp: currentEpochEndTimestamp,
    distributionAmountRuneBaseUnit,
  }
}

export const useCurrentEpochMetadataQuery = () => {
  const currentEpochMetadataQuery = useQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  return currentEpochMetadataQuery
}
