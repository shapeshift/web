import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { BigAmount, bn } from '@shapeshiftoss/utils'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { getAddress } from 'viem'

import { getRfoxStakingConfig, getStakingContract } from '../helpers'
import type { CurrentEpochMetadata, Epoch } from '../types'
import {
  fetchClosedEpochRewardState,
  getClosedEpochRewardStateQueryKey,
  hasClosedEpochDistribution,
} from './closedEpochRewardState'
import { calcEpochRewardForAccountUsdcBaseUnit } from './helpers'
import {
  getAffiliateRevenueUsdQueryFn,
  getAffiliateRevenueUsdQueryKey,
} from './useAffiliateRevenueUsdQuery'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { getEpochHistoryQueryOptions } from './useEpochHistoryQuery'

import { mergeQueryOutputs } from '@/react-queries/helpers'
import { selectAssetById, selectUsdRateByAssetId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EpochRewardsResultTuple = [
  epochHistory: Epoch[] | undefined,
  currentEpochRewardUnits: bigint | undefined,
  affiliateRevenueUsd: number | undefined,
]

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  currentEpochMetadata: CurrentEpochMetadata | undefined
  isEpochClosed: boolean
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetId,
  stakingAssetAccountId,
  currentEpochMetadata,
  isEpochClosed,
}: UseCurrentEpochRewardsQueryProps) => {
  const rewardAssetId = useMemo(
    () => getRfoxStakingConfig(stakingAssetId).rewardAssetId,
    [stakingAssetId],
  )

  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId))

  const rewardAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, rewardAssetId))

  const closedEpochRewardStateQuery = useQuery({
    queryKey: getClosedEpochRewardStateQueryKey({
      stakingAssetId,
      stakingAssetAccountId,
      metadata: currentEpochMetadata,
    }),
    queryFn:
      isEpochClosed &&
      stakingAssetAccountId &&
      currentEpochMetadata &&
      hasClosedEpochDistribution(stakingAssetId, currentEpochMetadata)
        ? () =>
            fetchClosedEpochRewardState(stakingAssetId, stakingAssetAccountId, currentEpochMetadata)
        : skipToken,
    staleTime: Infinity,
  })

  const closedEpochRewardState = closedEpochRewardStateQuery.data

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
        const earnedRewardUnits = closedEpochRewardState?.earned ?? currentEpochRewardUnits

        if (
          !epochHistory ||
          !earnedRewardUnits ||
          !affiliateRevenueUsd ||
          !currentEpochMetadata ||
          !rewardAsset ||
          !rewardAssetUsdRate
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

        const rewardUnits = earnedRewardUnits - previousEpochRewardUnits
        if (rewardUnits <= 0n) return 0n

        const affiliateRevenueUsdcBaseUnit = BigAmount.fromPrecision({
          value: bn(affiliateRevenueUsd).div(rewardAssetUsdRate),
          precision: rewardAsset.precision,
        }).toBaseUnit()

        return calcEpochRewardForAccountUsdcBaseUnit(
          rewardUnits,
          affiliateRevenueUsdcBaseUnit,
          currentEpochMetadata,
          stakingAssetId,
          closedEpochRewardState?.totalRewardUnits,
        )
      }

      return mergeQueryOutputs(queries, combineResults)
    },
    [
      closedEpochRewardState,
      currentEpochMetadata,
      stakingAssetId,
      stakingAssetAccountId,
      rewardAsset,
      rewardAssetUsdRate,
    ],
  )

  const combinedQueries = useQueries({
    queries: [
      getEpochHistoryQueryOptions({
        stakingAddress: stakingAssetAccountId
          ? fromAccountId(stakingAssetAccountId).account
          : undefined,
        epoch: currentEpochMetadata?.epoch,
      }),
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
        retry: 1,
        enabled: Boolean(currentEpochMetadata && stakingAssetAccountId && stakingAssetId),
      },
    ],
    combine,
  })

  return {
    data: combinedQueries.data,
    isLoading: combinedQueries.isLoading || closedEpochRewardStateQuery.isLoading,
    isError: combinedQueries.isError || closedEpochRewardStateQuery.isError,
  }
}
