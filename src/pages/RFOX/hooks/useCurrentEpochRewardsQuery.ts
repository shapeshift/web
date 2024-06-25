import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'

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
      const isLoading = results.some(result => result.isLoading)
      const isPending = results.some(result => result.isError || result.isLoading)
      const isError = results.some(result => result.isError)

      if (isLoading || isPending) {
        return {
          data: undefined,
          isLoading: true,
          isError: false,
        }
      }

      if (isError) {
        return {
          data: undefined,
          isLoading: false,
          isError: true,
        }
      }

      const [previousEpochEarned, currentEpochEarned] = results.map(result => result.data)

      const epochEarningsForAccount =
        (currentEpochEarned as bigint) - (previousEpochEarned as bigint)

      const epochRewardRuneBaseUnit = calcEpochRewardForAccountRuneBaseUnit(
        epochEarningsForAccount,
        epochMetadata,
      )

      return {
        data: epochRewardRuneBaseUnit,
        isLoading: false,
        isError: false,
      }
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
      },
    ],
    combine: combineResults,
  })

  return combinedQueries
}
