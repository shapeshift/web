import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { epochHistoryQueryFn, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

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
            // using queryClient.fetchQuery here is ok because historical epoch metadata does not change so reactivity is not needed
            const epochHistory = await queryClient.fetchQuery({
              queryKey: getEpochHistoryQueryKey(),
              queryFn: epochHistoryQueryFn,
            })

            const earnedByEpoch = await Promise.all(
              epochHistory.map(async epochMetadata => {
                // using queryClient.fetchQuery here is ok because historical earnings do not change so reactivity is not needed
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
