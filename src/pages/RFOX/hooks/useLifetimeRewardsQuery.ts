import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { RFOX_EPOCH_DURATION_DAYS, RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import { getEarnedQueryFn, getEarnedQueryKey } from './useEarnedQuery'
import { getEpochHistoryQueryFn, getEpochHistoryQueryKey } from './useEpochHistoryQuery'

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

  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
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
            const { data: epochHistory } = await queryClient.fetchQuery({
              queryKey: getEpochHistoryQueryKey(),
              queryFn: getEpochHistoryQueryFn(),
            })

            const earnedByEpoch = await Promise.all(
              epochHistory.map(async ({ endBlockNumber, distributionAmountsRuneBaseUnit }) => {
                const epochEarned = await queryClient.fetchQuery({
                  queryKey: getEarnedQueryKey({
                    stakingAssetAccountAddress,
                    blockNumber: endBlockNumber,
                  }),
                  queryFn: getEarnedQueryFn({
                    stakingAssetAccountAddress,
                    blockNumber: endBlockNumber,
                  }),
                })

                return { epochEarned, distributionAmountsRuneBaseUnit }
              }),
            )

            let totalRewardRuneBaseUnit = 0n
            let previousEpochEarned = 0n

            for (const { epochEarned, distributionAmountsRuneBaseUnit } of earnedByEpoch) {
              const epochEarningsForAccount = epochEarned - previousEpochEarned

              const secondsInEpoch: bigint = BigInt(
                dayjs.duration(RFOX_EPOCH_DURATION_DAYS, 'days').asSeconds(),
              )

              // TODO: Turn into util and re-use with useCurrentEpochRewardsQuery
              // NOTE: This is a simplified version of the calculation that is only accurate enough for
              // display purposes due to rounding differences between this approach and the internal
              // accounting on-chain.
              const totalEpochReward = (RFOX_REWARD_RATE / RFOX_WAD) * secondsInEpoch
              const epochRewardRuneBaseUnit =
                (epochEarningsForAccount / totalEpochReward) * distributionAmountsRuneBaseUnit
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
