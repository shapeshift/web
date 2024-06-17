import { RFOX_EPOCH_DURATION_DAYS, RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { Block } from 'viem'

import { useEarnedQuery } from './useEarnedQuery'

type UseEpochEarningsQueryProps = {
  stakingAssetAccountAddress: string | undefined
  currentBlock: Block
  epochStartBlockNumber: bigint
  epochDistributionAmountRuneBaseUnit: bigint
}

export const useEpochEarningsQuery = ({
  stakingAssetAccountAddress,
  epochStartBlockNumber,
  epochDistributionAmountRuneBaseUnit,
}: UseEpochEarningsQueryProps) => {
  const previousEpochEarnedQuery = useEarnedQuery({
    stakingAssetAccountAddress,
    blockNumber: epochStartBlockNumber,
  })

  const currentEpochEarnedQuery = useEarnedQuery({
    stakingAssetAccountAddress,
    blockNumber: undefined, // Use the latest block
  })

  const isLoading = useMemo(() => {
    return previousEpochEarnedQuery.isLoading || currentEpochEarnedQuery.isLoading
  }, [previousEpochEarnedQuery.isLoading, currentEpochEarnedQuery.isLoading])

  const isError = useMemo(() => {
    return previousEpochEarnedQuery.isError || currentEpochEarnedQuery.isError
  }, [previousEpochEarnedQuery.isError, currentEpochEarnedQuery.isError])

  const currentEpochRewardForAccountRuneBaseUnit = useMemo(() => {
    const previousEpochEarned = previousEpochEarnedQuery.data as bigint | undefined
    const currentEpochEarned = currentEpochEarnedQuery.data as bigint | undefined

    if (
      isLoading ||
      isError ||
      previousEpochEarned === undefined ||
      currentEpochEarned === undefined
    ) {
      return undefined
    }

    const epochEarningsForAccount = currentEpochEarned - currentEpochEarned

    // Use hardcoded epoch duration to calculate the total reward for the epoch since the epoch
    // end block is in the future and we don't know its exact timestamp yet.
    const secondsInEpoch: bigint = BigInt(
      dayjs.duration(RFOX_EPOCH_DURATION_DAYS, 'days').asSeconds(),
    )

    // NOTE: This is a simplified version of the calculation that is only accurate enough for
    // display purposes due to rounding differences between this approach and the internal
    // accounting on-chain.
    const totalEpochReward = (RFOX_REWARD_RATE / RFOX_WAD) * secondsInEpoch
    return (epochEarningsForAccount / totalEpochReward) * epochDistributionAmountRuneBaseUnit
  }, [
    epochDistributionAmountRuneBaseUnit,
    currentEpochEarnedQuery.data,
    isError,
    isLoading,
    previousEpochEarnedQuery.data,
  ])

  if (isLoading) {
    return {
      isLoading,
      error: null,
      data: undefined,
    }
  }

  if (isError) {
    return {
      isLoading: false,
      error: previousEpochEarnedQuery.error || currentEpochEarnedQuery.error,
      data: undefined,
    }
  }

  return {
    isLoading: false,
    error: null,
    data: currentEpochRewardForAccountRuneBaseUnit,
  }
}
