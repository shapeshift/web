import { useMemo } from 'react'

import type { EpochMetadata } from '../types'
import { calcEpochRewardForAccountRuneBaseUnit } from './helpers'
import { useEarnedQuery } from './useEarnedQuery'

type UseCurrentEpochRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
  epochMetadata: EpochMetadata
}

export const useCurrentEpochRewardsQuery = ({
  stakingAssetAccountAddress,
  epochMetadata,
}: UseCurrentEpochRewardsQueryProps) => {
  const previousEpochEarnedQuery = useEarnedQuery({
    stakingAssetAccountAddress,
    blockNumber: epochMetadata.startBlockNumber,
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

    const epochEarningsForAccount = currentEpochEarned - previousEpochEarned

    return calcEpochRewardForAccountRuneBaseUnit(epochEarningsForAccount, epochMetadata)
  }, [
    epochMetadata,
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
