import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { skipToken, useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { RFOX_STAKING_ASSET_IDS } from '../constants'
import { getRfoxChainId, selectStakingBalance } from '../helpers'
import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'
import { getStakingInfoQueryFn, getStakingInfoQueryKey } from './useStakingInfoQuery'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectAccountIdByAccountNumberAndChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseRfoxPositionsQueryProps = {
  accountNumber: number | undefined
  enabled?: boolean
}

/**
 * Whether the given account still holds a position - staked balance, or an unstaking request that
 * has yet to be claimed - in each rFOX staking program. Sunset programs stay visible only while
 * this is true, so a user mid-migration keeps access to unstake and claim until they are done.
 */
export const useRfoxPositionsQuery = ({
  accountNumber,
  enabled = true,
}: UseRfoxPositionsQueryProps) => {
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const accountIdByStakingAssetId = useMemo(() => {
    if (accountNumber === undefined) return {}

    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[accountNumber]

    return RFOX_STAKING_ASSET_IDS.reduce<Record<AssetId, AccountId | undefined>>(
      (acc, stakingAssetId) => {
        acc[stakingAssetId] = accountNumberAccountIds?.[getRfoxChainId(stakingAssetId)]
        return acc
      },
      {},
    )
  }, [accountIdsByAccountNumberAndChainId, accountNumber])

  const unstakingRequestsQuery = useGetUnstakingRequestsQuery()

  const stakingBalanceQueries = useQueries({
    queries: RFOX_STAKING_ASSET_IDS.map(stakingAssetId => {
      const stakingAssetAccountId = accountIdByStakingAssetId[stakingAssetId]

      return {
        queryKey: getStakingInfoQueryKey({ stakingAssetAccountId, stakingAssetId }),
        queryFn:
          enabled && stakingAssetAccountId
            ? () => getStakingInfoQueryFn({ stakingAssetAccountId, stakingAssetId })
            : skipToken,
        enabled: Boolean(enabled && stakingAssetAccountId),
        select: selectStakingBalance,
      }
    }),
  })

  const hasStakingBalanceByStakingAssetId = useMemo(
    () =>
      RFOX_STAKING_ASSET_IDS.reduce<Record<AssetId, boolean>>((acc, stakingAssetId, i) => {
        acc[stakingAssetId] = bnOrZero(stakingBalanceQueries[i]?.data).gt(0)
        return acc
      }, {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stakingBalanceQueries.map(query => query.data).join('-')],
  )

  const hasPositionByStakingAssetId = useMemo(() => {
    const allUnstakingRequests = unstakingRequestsQuery.data?.all ?? []

    return RFOX_STAKING_ASSET_IDS.reduce<Record<AssetId, boolean>>((acc, stakingAssetId) => {
      const hasUnstakingRequests = allUnstakingRequests.some(
        request => request.stakingAssetId === stakingAssetId,
      )

      acc[stakingAssetId] = hasStakingBalanceByStakingAssetId[stakingAssetId] || hasUnstakingRequests
      return acc
    }, {})
  }, [hasStakingBalanceByStakingAssetId, unstakingRequestsQuery.data?.all])

  const isLoading = useMemo(
    () => unstakingRequestsQuery.isLoading || stakingBalanceQueries.some(query => query.isLoading),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unstakingRequestsQuery.isLoading, stakingBalanceQueries.map(query => query.isLoading).join('-')],
  )

  return { hasPositionByStakingAssetId, isLoading }
}
