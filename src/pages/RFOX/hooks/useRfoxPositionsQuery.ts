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

  // useQueries hands back a new array of new objects every render, so the balances it resolved to
  // are the real input here - keyed as one string, since the array is new each time too
  const stakingBalances = stakingBalanceQueries.map(query => query.data)
  const stakingBalancesKey = stakingBalances.join('-')

  const hasStakingBalanceByStakingAssetId = useMemo(
    () =>
      RFOX_STAKING_ASSET_IDS.reduce<Record<AssetId, boolean>>((acc, stakingAssetId, i) => {
        acc[stakingAssetId] = bnOrZero(stakingBalances[i]).gt(0)
        return acc
      }, {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stakingBalancesKey],
  )

  const hasPositionByStakingAssetId = useMemo(() => {
    const unstakingRequestsByAccountId = unstakingRequestsQuery.data?.byAccountId

    return RFOX_STAKING_ASSET_IDS.reduce<Record<AssetId, boolean>>((acc, stakingAssetId) => {
      const stakingAssetAccountId = accountIdByStakingAssetId[stakingAssetId]

      // An accountId is shared by every program on its chain, so the program still has to be matched
      const hasUnstakingRequests = Boolean(
        unstakingRequestsByAccountId?.[stakingAssetAccountId ?? '']?.some(
          request => request.stakingAssetId === stakingAssetId,
        ),
      )

      acc[stakingAssetId] =
        hasStakingBalanceByStakingAssetId[stakingAssetId] || hasUnstakingRequests
      return acc
    }, {})
  }, [
    accountIdByStakingAssetId,
    hasStakingBalanceByStakingAssetId,
    unstakingRequestsQuery.data?.byAccountId,
  ])

  const isLoading =
    unstakingRequestsQuery.isLoading || stakingBalanceQueries.some(query => query.isLoading)

  return { hasPositionByStakingAssetId, isLoading }
}
