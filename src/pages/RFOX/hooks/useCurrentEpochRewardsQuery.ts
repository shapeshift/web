import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import { getStakingContract } from '../helpers'
import type { CurrentEpochMetadata, Epoch } from '../types'
import { calcEpochRewardForAccountUsd } from './helpers'
import {
  getAffiliateRevenueUsdQueryFn,
  getAffiliateRevenueUsdQueryKey,
} from './useAffiliateRevenueUsdQuery'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { fetchEpochHistory, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

import { mergeQueryOutputs } from '@/react-queries/helpers'

type EpochRewardsResultTuple = [
  epochHistory: Epoch[] | undefined,
  currentEpochRewardUnits: bigint | undefined,
  affiliateRevenueUsd: number | undefined,
]

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  currentEpochMetadata: CurrentEpochMetadata | undefined
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetId,
  stakingAssetAccountId,
  currentEpochMetadata,
}: UseCurrentEpochRewardsQueryProps) => {
  const combine = useCallback(
    (
      queries: [
        UseQueryResult<Epoch[], Error>,
        UseQueryResult<bigint, Error>,
        UseQueryResult<number, Error>,
      ],
    ) => {
      const combineResults = (_results: (Epoch[] | bigint | number | undefined)[]) => {
        if (!stakingAssetAccountId) return 0n

        const results = _results as EpochRewardsResultTuple
        const [epochHistory, currentEpochRewardUnits, affiliateRevenueUsd] = results

        if (
          !epochHistory ||
          !currentEpochRewardUnits ||
          !affiliateRevenueUsd ||
          !currentEpochMetadata
        )
          return 0n

        const previousEpochRewardUnits = epochHistory.reduce((lastKnownEpochRewardUnits, epoch) => {
          if (lastKnownEpochRewardUnits !== 0n) return lastKnownEpochRewardUnits

          const distribution =
            epoch.detailsByStakingContract[getStakingContract(stakingAssetId)]
              ?.distributionsByStakingAddress[
              getAddress(fromAccountId(stakingAssetAccountId).account)
            ]?.totalRewardUnits

          return distribution ? BigInt(distribution) : 0n
        }, 0n)

        const rewardUnits = currentEpochRewardUnits - previousEpochRewardUnits

        return calcEpochRewardForAccountUsd(
          rewardUnits,
          affiliateRevenueUsd,
          currentEpochMetadata,
          stakingAssetId,
        )
      }

      return mergeQueryOutputs(queries, combineResults)
    },
    [currentEpochMetadata, stakingAssetId, stakingAssetAccountId],
  )

  const combinedQueries = useQueries({
    queries: [
      {
        queryKey: getEpochHistoryQueryKey(),
        queryFn: fetchEpochHistory,
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountId && stakingAssetId),
      },
      {
        queryKey: getEarnedQueryKey({
          stakingAssetAccountId,
          stakingAssetId,
        }),
        queryFn: getEarnedQueryFn({
          stakingAssetAccountId,
          stakingAssetId,
        }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountId && stakingAssetId),
      },
      {
        queryKey: getAffiliateRevenueUsdQueryKey({
          startTimestamp: currentEpochMetadata?.epochStartTimestamp,
          endTimestamp: currentEpochMetadata?.epochEndTimestamp,
        }),
        queryFn: getAffiliateRevenueUsdQueryFn({
          startTimestamp: currentEpochMetadata?.epochStartTimestamp,
          endTimestamp: currentEpochMetadata?.epochEndTimestamp,
        }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountId && stakingAssetId),
      },
    ],
    combine,
  })

  return combinedQueries
}
