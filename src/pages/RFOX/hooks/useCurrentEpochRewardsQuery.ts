import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'
import { getAddress } from 'viem'

import type { CurrentEpochMetadata, Epoch } from '../types'
import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { getAffiliateRevenueQueryFn, getAffiliateRevenueQueryKey } from './useAffiliateRevenueQuery'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { fetchEpochHistory, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

type EpochRewardsResultTuple = [
  epochHistory: Epoch[] | undefined,
  currentEpochRewardUnits: bigint | undefined,
  affiliateRevenue: bigint | undefined,
]

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
  currentEpochMetadata: CurrentEpochMetadata | undefined
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetAccountAddress,
  currentEpochMetadata,
}: UseCurrentEpochRewardsQueryProps) => {
  const combine = useCallback(
    (
      queries: [
        UseQueryResult<Epoch[], Error>,
        UseQueryResult<bigint, Error>,
        UseQueryResult<bigint, Error>,
      ],
    ) => {
      const combineResults = (
        _results: (Epoch[] | bigint | CurrentEpochMetadata | undefined)[],
      ) => {
        if (!stakingAssetAccountAddress) return 0n

        const results = _results as EpochRewardsResultTuple

        const [epochHistory, currentEpochRewardUnits, affiliateRevenue] = results

        if (!epochHistory || !currentEpochRewardUnits || !affiliateRevenue || !currentEpochMetadata)
          return

        const previousEpoch = epochHistory[epochHistory.length - 1]
        const previousDistribution =
          previousEpoch?.distributionsByStakingAddress[getAddress(stakingAssetAccountAddress)]
        const previousEpochRewardUnits = BigInt(previousDistribution?.totalRewardUnits ?? '0')
        const rewardUnits = currentEpochRewardUnits - previousEpochRewardUnits

        return calcEpochRewardForAccountRuneBaseUnit(
          rewardUnits,
          affiliateRevenue,
          currentEpochMetadata,
        )
      }

      return mergeQueryOutputs(queries, combineResults)
    },
    [currentEpochMetadata, stakingAssetAccountAddress],
  )

  const combinedQueries = useQueries({
    queries: [
      {
        queryKey: getEpochHistoryQueryKey(),
        queryFn: fetchEpochHistory,
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountAddress),
      },
      {
        queryKey: getEarnedQueryKey({ stakingAssetAccountAddress }),
        queryFn: getEarnedQueryFn({ stakingAssetAccountAddress }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountAddress),
      },
      {
        queryKey: getAffiliateRevenueQueryKey({
          startTimestamp: currentEpochMetadata?.epochStartTimestamp,
          endTimestamp: currentEpochMetadata?.epochEndTimestamp,
        }),
        queryFn: getAffiliateRevenueQueryFn({
          startTimestamp: currentEpochMetadata?.epochStartTimestamp,
          endTimestamp: currentEpochMetadata?.epochEndTimestamp,
        }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountAddress),
      },
    ],
    combine,
  })

  return combinedQueries
}
