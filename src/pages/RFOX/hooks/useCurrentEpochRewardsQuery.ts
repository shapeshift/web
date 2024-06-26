import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'

import type { PartialEpochMetadata } from '../types'
import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { fetchCurrentEpochMetadata, getCurrentEpochMetadataQueryKey } from './useEpochHistoryQuery'

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
}

/**
 * Gets the rewards so far for the current epoch for a given account address.
 */
export const useCurrentEpochRewardsQuery = ({
  stakingAssetAccountAddress,
}: UseCurrentEpochRewardsQueryProps) => {
  const currentEpochMetadataQuery = useQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  const combine = useCallback(
    (_queries: [UseQueryResult<bigint, Error>, UseQueryResult<bigint, Error>]) => {
      const combineResults = (_results: (bigint | PartialEpochMetadata)[]) => {
        const results = _results as [bigint, bigint, PartialEpochMetadata]
        const currentEpochMetadata = currentEpochMetadataQuery.data
        const [previousEpochEarned, currentEpochEarned] = results

        const epochEarningsForAccount = currentEpochEarned - previousEpochEarned

        const epochRewardRuneBaseUnit = currentEpochMetadata
          ? calcEpochRewardForAccountRuneBaseUnit(epochEarningsForAccount, currentEpochMetadata)
          : 0n

        return epochRewardRuneBaseUnit
      }

      // this is ugly because of concat with a tuple, but having currentEpochMetadataQuery allows us to leverage its loading state as part of the combined queries too
      const queries = (
        _queries as unknown as [
          UseQueryResult<bigint, Error>,
          UseQueryResult<bigint, Error>,
          UseQueryResult<PartialEpochMetadata, Error>,
        ]
      ).concat([currentEpochMetadataQuery])

      return mergeQueryOutputs(queries, combineResults)
    },
    [currentEpochMetadataQuery],
  )

  const combinedQueries = useQueries({
    queries: [
      {
        queryKey: getEarnedQueryKey({
          stakingAssetAccountAddress,
          blockNumber: currentEpochMetadataQuery.data
            ? currentEpochMetadataQuery.data.startBlockNumber - 1n
            : undefined,
        }),
        queryFn: currentEpochMetadataQuery.data
          ? getEarnedQueryFn({
              stakingAssetAccountAddress,
              blockNumber: currentEpochMetadataQuery.data
                ? currentEpochMetadataQuery.data.startBlockNumber - 1n
                : undefined,
            })
          : skipToken,
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
    combine,
  })

  return combinedQueries
}
