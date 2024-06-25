import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { fetchEpochHistory, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

type UseLifetimeRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
}

/**
 * Gets the lifetime rewards for a given account address, excluding the current epoch.
 */
export const useLifetimeRewardsQuery = ({
  stakingAssetAccountAddress,
}: UseLifetimeRewardsQueryProps) => {
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
            const epochHistory = await queryClient.fetchQuery({
              queryKey: getEpochHistoryQueryKey(),
              queryFn: fetchEpochHistory,
            })

            const earnedByEpoch = await Promise.all(
              epochHistory.map(async epochMetadata => {
                const earned = await queryClient.fetchQuery({
                  queryKey: getEarnedQueryKey({
                    stakingAssetAccountAddress,
                    blockNumber: epochMetadata.endBlockNumber,
                  }),
                  queryFn: getEarnedQueryFn({
                    stakingAssetAccountAddress,
                    blockNumber: epochMetadata.endBlockNumber,
                  }),
                })

                return {
                  earned,
                  epochMetadata,
                }
              }),
            )

            let totalRewardRuneBaseUnit = 0n
            let previousEpochEarned = 0n

            for (const { earned, epochMetadata } of earnedByEpoch) {
              const epochEarningsForAccount = earned - previousEpochEarned
              const epochRewardRuneBaseUnit = calcEpochRewardForAccountRuneBaseUnit(
                epochEarningsForAccount,
                epochMetadata,
              )
              totalRewardRuneBaseUnit += epochRewardRuneBaseUnit
              previousEpochEarned = epochEarningsForAccount
            }

            return totalRewardRuneBaseUnit
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
