import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'

import type { AbiStakingInfo, EpochMetadata } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'
import { getReadStakingInfoQueryFn, getReadStakingInfoQueryKey } from './useStakingInfoQuery'

type UseStakingInfoHistoryQueryProps<SelectData = AbiStakingInfo> = {
  stakingAssetAccountAddress: string | undefined
  select?: (stakingInfo: AbiStakingInfo) => SelectData
}

/**
 * Fetches the historical StakingInfo at the end of each epoch in the past. Doesn't include the current epoch.
 */
export const useStakingInfoHistoryQuery = <SelectData = AbiStakingInfo>({
  stakingAssetAccountAddress,
  select,
}: UseStakingInfoHistoryQueryProps<SelectData>) => {
  const epochHistory = useEpochHistoryQuery()

  const combine = useCallback(
    (queries: UseQueryResult<SelectData, Error>[]) => {
      // This allows us to combine loading state from useEpochHistoryQuery so it doesn't show loaded data while staking info data is loading
      return mergeQueryOutputs<EpochMetadata | SelectData, Error, SelectData[]>(
        [epochHistory, ...queries] as UseQueryResult<EpochMetadata | SelectData, Error>[],
        results => {
          const [, ...stakingInfoResults] = results
          return stakingInfoResults as SelectData[]
        },
      )
    },
    [epochHistory],
  )

  // Not using wagmi useReadContracts because a single revert results in all queries failing, but
  // reverts are expected in the case the user didn't stake in the epoch.
  const combinedQueries = useQueries({
    queries: (epochHistory.data?.map(epoch => ({
      queryKey: getReadStakingInfoQueryKey(stakingAssetAccountAddress, epoch.endBlockNumber),
      queryFn: stakingAssetAccountAddress
        ? getReadStakingInfoQueryFn(stakingAssetAccountAddress, epoch.endBlockNumber)
        : skipToken,
      staleTime: 60 * 60 * 1000, // 1 hour in milliseconds
      select,
    })) ?? []) as readonly UseQueryOptions<SelectData, Error>[],
    combine,
  })

  return combinedQueries
}
