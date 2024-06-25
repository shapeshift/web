import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

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
  const queryClient = useQueryClient()

  const queryKey = useMemo(
    () => [
      'lifetimeRewards',
      {
        stakingAssetAccountAddress,
      },
    ],
    [stakingAssetAccountAddress],
  )

  const queryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? async () => {
            const [previousEpochEarned, currentEpochEarned] = await Promise.all([
              queryClient.fetchQuery({
                queryKey: getEarnedQueryKey({
                  stakingAssetAccountAddress,
                  blockNumber: epochMetadata.startBlockNumber - 1n,
                }),
                queryFn: getEarnedQueryFn({
                  stakingAssetAccountAddress,
                  blockNumber: epochMetadata.startBlockNumber - 1n,
                }),
              }),
              queryClient.fetchQuery({
                queryKey: getEarnedQueryKey({
                  stakingAssetAccountAddress,
                  blockNumber: undefined,
                }),
                queryFn: getEarnedQueryFn({
                  stakingAssetAccountAddress,
                  blockNumber: undefined,
                }),
              }),
            ])

            const epochEarningsForAccount =
              (currentEpochEarned as bigint) - (previousEpochEarned as bigint)

            const epochRewardRuneBaseUnit = calcEpochRewardForAccountRuneBaseUnit(
              epochEarningsForAccount,
              epochMetadata,
            )

            return epochRewardRuneBaseUnit
          }
        : skipToken,
    [epochMetadata, queryClient, stakingAssetAccountAddress],
  )

  const epochEarnedHistoryQuery = useQuery({
    queryKey,
    queryFn,
  })

  return epochEarnedHistoryQuery
}
