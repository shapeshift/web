import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
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
  const queryClient = useQueryClient()

  const queryKey = useMemo(
    () => [
      'currentEpochRewards',
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
            const epochHistory = await queryClient.fetchQuery({
              queryKey: getEpochHistoryQueryKey(),
              queryFn: fetchEpochHistory,
            })

            const currentEpochMetadata = epochHistory[epochHistory.length - 1]

            if (!currentEpochMetadata) throw new Error('No current epoch metadata')

            const [previousEpochEarned, currentEpochEarned] = await Promise.all([
              queryClient.fetchQuery({
                queryKey: getEarnedQueryKey({
                  stakingAssetAccountAddress,
                  blockNumber: currentEpochMetadata.startBlockNumber - 1n,
                }),
                queryFn: getEarnedQueryFn({
                  stakingAssetAccountAddress,
                  blockNumber: currentEpochMetadata.startBlockNumber - 1n,
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
              currentEpochMetadata,
            )

            return epochRewardRuneBaseUnit
          }
        : skipToken,
    [queryClient, stakingAssetAccountAddress],
  )

  const epochEarnedHistoryQuery = useQuery({
    queryKey,
    queryFn,
  })

  return epochEarnedHistoryQuery
}
