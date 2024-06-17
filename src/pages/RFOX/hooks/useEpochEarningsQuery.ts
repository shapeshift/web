import { RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import { useMemo } from 'react'
import type { Block } from 'viem'

import { useEarnedQuery } from './useEarnedQuery'

type UseEpochEarningsQueryProps = {
  stakingAssetAccountAddress: string | undefined
  epochEndBlock: Block
  epochStartBlock: Block
  epochDistributionAmountRuneBaseUnit: bigint
}

export const useEpochEarningsQuery = ({
  stakingAssetAccountAddress,
  epochEndBlock,
  epochStartBlock,
  epochDistributionAmountRuneBaseUnit,
}: UseEpochEarningsQueryProps) => {
  const previousEpochEarnedQuery = useEarnedQuery({
    stakingAssetAccountAddress,
    blockNumber: epochStartBlock.number ?? undefined,
  })

  const currentEpochEarnedQuery = useEarnedQuery({
    stakingAssetAccountAddress,
    blockNumber: epochEndBlock.number ?? undefined,
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
    const secondsInEpoch: bigint = epochEndBlock.timestamp - epochStartBlock.timestamp

    // NOTE: This is a simplified version of the calculation that is only accurate enough for
    // display purposes due to rounding differences between this approach and the internal
    // accounting on-chain.
    const totalEpochReward = (RFOX_REWARD_RATE / RFOX_WAD) * secondsInEpoch
    return (epochEarningsForAccount / totalEpochReward) * epochDistributionAmountRuneBaseUnit
  }, [
    epochDistributionAmountRuneBaseUnit,
    currentEpochEarnedQuery.data,
    epochEndBlock.timestamp,
    isError,
    isLoading,
    previousEpochEarnedQuery.data,
    epochStartBlock.timestamp,
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
