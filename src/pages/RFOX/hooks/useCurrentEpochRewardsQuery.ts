import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'
import { getAddress } from 'viem'

import type { Epoch, PartialEpoch, RewardDistribution } from '../types'
import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { fetchCurrentEpoch, getCurrentEpochQueryKey } from './useCurrentEpochQuery'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { fetchEpochHistory, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetAccountAddress,
}: UseCurrentEpochRewardsQueryProps) => {
  const combine = useCallback(
    (
      queries: [
        UseQueryResult<Epoch[], Error>,
        UseQueryResult<bigint, Error>,
        UseQueryResult<PartialEpoch, Error>,
      ],
    ) => {
      const combineResults = (_results: (Epoch[] | bigint | PartialEpoch | undefined)[]) => {
        if (!stakingAssetAccountAddress) return 0n

        const checksummedStakingAssetAccountAddress = getAddress(stakingAssetAccountAddress)

        const results = _results as [
          Epoch[] | undefined,
          bigint | undefined,
          PartialEpoch | undefined,
        ]
        const [epochHistory, currentEpochRewardUnits, currentEpochMetadata] = results
        if (
          currentEpochMetadata === undefined ||
          epochHistory === undefined ||
          currentEpochRewardUnits === undefined
        ) {
          return
        }

        const previousEpoch: RewardDistribution | undefined =
          epochHistory?.[epochHistory.length - 1].distributionsByStakingAddress[
            checksummedStakingAssetAccountAddress
          ]

        const previousEpochRewardUnits = BigInt(previousEpoch?.rewardUnits ?? '0')
        const epochRewardUnitsForAccount = currentEpochRewardUnits - previousEpochRewardUnits

        return calcEpochRewardForAccountRuneBaseUnit(
          epochRewardUnitsForAccount,
          currentEpochMetadata,
        )
      }

      return mergeQueryOutputs(queries, combineResults)
    },
    [stakingAssetAccountAddress],
  )

  const combinedQueries = useQueries({
    queries: [
      {
        queryKey: getEpochHistoryQueryKey(),
        queryFn: fetchEpochHistory,
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: !!stakingAssetAccountAddress,
      },
      {
        queryKey: getEarnedQueryKey({
          stakingAssetAccountAddress,
        }),
        queryFn: getEarnedQueryFn({
          stakingAssetAccountAddress,
        }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: !!stakingAssetAccountAddress,
      },
      {
        queryKey: getCurrentEpochQueryKey(),
        queryFn: fetchCurrentEpoch,
        staleTime: 60 * 1000, // 1 minute in milliseconds
        enabled: !!stakingAssetAccountAddress,
      },
    ],
    combine,
  })

  return combinedQueries
}
