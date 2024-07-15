import { useQuery } from '@tanstack/react-query'
import { RFOX_PROXY_CONTRACT_ADDRESS, RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import dayjs from 'dayjs'
import { queryClient } from 'context/QueryClientProvider/queryClient'

import type { Epoch, PartialEpoch } from '../types'
import { getRfoxContractCreationBlockNumber } from './helpers'
import { getAffiliateRevenueQueryFn, getAffiliateRevenueQueryKey } from './useAffiliateRevenueQuery'
import {
  fetchCurrentEpochMetadata,
  getCurrentEpochMetadataQueryKey,
} from './useCurrentEpochMetadataQuery'
import { fetchEpochHistory, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

type CurrentEpochMetadataQueryKey = ['currentEpoch']

export const getCurrentEpochQueryKey = (): CurrentEpochMetadataQueryKey => ['currentEpoch']

export const fetchCurrentEpoch = async (): Promise<PartialEpoch> => {
  const currentEpochMetadata = await queryClient.fetchQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  const [historicalEpochs, affiliateRevenueRuneBaseUnit] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: getEpochHistoryQueryKey(),
      queryFn: fetchEpochHistory,
    }),
    queryClient.fetchQuery({
      queryKey: getAffiliateRevenueQueryKey({
        startTimestamp: BigInt(currentEpochMetadata.epochStartTimestamp),
        endTimestamp: BigInt(currentEpochMetadata.epochEndTimestamp),
      }),
      queryFn: getAffiliateRevenueQueryFn({
        startTimestamp: BigInt(currentEpochMetadata.epochStartTimestamp),
        endTimestamp: BigInt(currentEpochMetadata.epochEndTimestamp),
      }),
    }),
  ])

  const lastHistoricalEpoch: Epoch | undefined = historicalEpochs[historicalEpochs.length - 1]

  // Calculate the total reward units for the current epoch so far. Note this is not the total
  // reward units for the epoch because the epoch is still ongoing and the affiliate revenue is
  // only complete up to the current block.
  const secondsInCurrentEpoch = dayjs().unix() - currentEpochMetadata.epochStartTimestamp / 1000
  const totalRewardUnits = (RFOX_REWARD_RATE / RFOX_WAD) * BigInt(secondsInCurrentEpoch)

  return {
    number: currentEpochMetadata.epoch,
    startTimestamp: currentEpochMetadata.epochStartTimestamp,
    endTimestamp: currentEpochMetadata.epochEndTimestamp,
    // If this is the first epoch there will be no historical epochs, so we use the contract creation block number as the start block
    startBlock: lastHistoricalEpoch
      ? lastHistoricalEpoch.endBlock + 1
      : Number(getRfoxContractCreationBlockNumber(RFOX_PROXY_CONTRACT_ADDRESS)),
    endBlock: undefined,
    totalRevenue: affiliateRevenueRuneBaseUnit.toString(),
    totalRewardUnits: totalRewardUnits.toString(),
    distributionRate: currentEpochMetadata.distributionRate,
    burnRate: currentEpochMetadata.burnRate,
    distributionsByStakingAddress: {},
  }
}

export const useCurrentEpochQuery = () => {
  const currentEpochQuery = useQuery({
    queryKey: getCurrentEpochQueryKey(),
    queryFn: fetchCurrentEpoch,
  })

  return currentEpochQuery
}
