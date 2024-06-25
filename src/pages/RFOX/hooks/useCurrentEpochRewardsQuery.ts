import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'

import type { EpochMetadata } from '../types'
import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
  epochMetadata: EpochMetadata
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetAccountAddress,
  epochMetadata,
}: UseCurrentEpochRewardsQueryProps) => {
  const combineResults = useCallback(
    (results: [UseQueryResult<bigint, Error>, UseQueryResult<bigint, Error>]) => {
      const combineResults = (results: bigint[]) => {
        const [previousEpochEarned, currentEpochEarned] = results

        const epochEarningsForAccount = currentEpochEarned - previousEpochEarned

        const epochRewardRuneBaseUnit = calcEpochRewardForAccountRuneBaseUnit(
          epochEarningsForAccount,
          epochMetadata,
        )

        return epochRewardRuneBaseUnit
      }
      return mergeQueryOutputs(results, combineResults)
    },
    [epochMetadata],
  )

  const combinedQueries = useQueries({
    queries: [
      {
        queryKey: getEarnedQueryKey({
          stakingAssetAccountAddress,
          blockNumber: epochMetadata.startBlockNumber - 1n,
        }),
        queryFn: getEarnedQueryFn({
          stakingAssetAccountAddress,
          blockNumber: epochMetadata.startBlockNumber - 1n,
        }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
      },
      {
        queryKey: getEarnedQueryKey({
          stakingAssetAccountAddress,
          blockNumber: undefined,
        }),
        queryFn: getEarnedQueryFn({
          stakingAssetAccountAddress,
          blockNumber: undefined,
        }),
        staleTime: 60 * 1000, // 1 minute in milliseconds
      },
    ],
    combine: combineResults,
  })

  return combinedQueries
}
