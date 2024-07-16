import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'

import type { Epoch, PartialEpoch } from '../types'
import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { fetchCurrentEpoch, getCurrentEpochQueryKey } from './useCurrentEpochQuery'
import { getEarnedQueryFn, getEarnedQueryKey, useEarnedQuery } from './useEarnedQuery'
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
  // TODO: remove once `totalRewardUnits` are present in `RewardDistribution` data
  const { data: previousEpochRewardUnits } = useEarnedQuery({
    stakingAssetAccountAddress,
    blockNumber: 227313374n, // TEMP: 💀 hardcoded top Jun-30-2024 01:59:59 PM +UTC because this block is cached by the node
  })

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

        /*
          TODO: uncomment once `totalRewardUnits` are present in `RewardDistribution` data
          const checksumStakingAssetAccountAddress = getAddress(stakingAssetAccountAddress)
          const previousEpoch: RewardDistribution | undefined =
            epochHistory?.[epochHistory.length - 1]?.distributionsByStakingAddress[
              checksumStakingAssetAccountAddress
            ]

          const previousEpochRewardUnits = BigInt(previousEpoch?.totalRewardUnits ?? '0')
        */
        const epochRewardUnitsForAccount =
          currentEpochRewardUnits - (previousEpochRewardUnits ?? 0n)

        console.log({
          currentEpochRewardUnits,
          previousEpochRewardUnits,
          epochRewardUnitsForAccount,
        })

        return calcEpochRewardForAccountRuneBaseUnit(
          epochRewardUnitsForAccount,
          currentEpochMetadata,
        )
      }

      return mergeQueryOutputs(queries, combineResults)
    },
    [previousEpochRewardUnits, stakingAssetAccountAddress],
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
