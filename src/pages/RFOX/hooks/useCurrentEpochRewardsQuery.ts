import type { AssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'
import { getAddress } from 'viem'

import { getStakingContract } from '../helpers'
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
  stakingAssetId: AssetId
  stakingAssetAccountAddress: string | undefined
  currentEpochMetadata: CurrentEpochMetadata | undefined
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetId,
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
      const combineResults = (_results: (Epoch[] | bigint | undefined)[]) => {
        if (!stakingAssetAccountAddress) return 0n

        const results = _results as EpochRewardsResultTuple

        const [epochHistory, currentEpochRewardUnits, affiliateRevenue] = results

        if (!epochHistory || !currentEpochRewardUnits || !affiliateRevenue || !currentEpochMetadata)
          return 0n

        const orderedEpochHistory = epochHistory.sort((a, b) => a.number - b.number)
        const previousEpoch = orderedEpochHistory[epochHistory.length - 1]

        const previousDistribution =
          previousEpoch?.detailsByStakingContract[getStakingContract(stakingAssetId)]
            ?.distributionsByStakingAddress[getAddress(stakingAssetAccountAddress)]

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
    [currentEpochMetadata, stakingAssetId, stakingAssetAccountAddress],
  )

  const combinedQueries = useQueries({
    queries: [
      {
        queryKey: getEpochHistoryQueryKey(),
        queryFn: fetchEpochHistory,
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountAddress && stakingAssetId),
      },
      {
        queryKey: getEarnedQueryKey({ stakingAssetAccountAddress, stakingAssetId }),
        queryFn: getEarnedQueryFn({ stakingAssetAccountAddress, stakingAssetId }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountAddress && stakingAssetId),
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
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountAddress && stakingAssetId),
      },
    ],
    combine,
  })

  return combinedQueries
}
