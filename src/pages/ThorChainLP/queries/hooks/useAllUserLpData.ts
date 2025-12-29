import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { thorPoolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getUserLpDataPosition } from './useUserLpData'

import { isSome } from '@/lib/utils'
import { useThorchainMimirTimes } from '@/lib/utils/thorchain/hooks/useThorchainMimirTimes'
import type { Position, UserLpDataPosition } from '@/lib/utils/thorchain/lp/types'
import { reactQueries } from '@/react-queries'
import { findAccountsByAssetId } from '@/state/slices/portfolioSlice/utils'
import {
  selectAssets,
  selectEnabledWalletAccountIds,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataUserCurrency,
  selectPortfolioAccounts,
  selectWalletId,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type UseAllUserLpDataReturn = {
  assetId: AssetId
  positions: UserLpDataPosition[]
}

export const useAllUserLpData = (): UseQueryResult<UseAllUserLpDataReturn | null>[] => {
  const queryClient = useQueryClient()
  const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const runeAccountIds = findAccountsByAssetId(portfolioAccounts, thorchainAssetId)
  const walletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const currentWalletId = useAppSelector(selectWalletId)

  const { data: thorchainMimirTimes, isSuccess: isThorchainMimirTimesSuccess } =
    useThorchainMimirTimes()

  const { data: pools, isSuccess } = useQuery({
    ...reactQueries.thornode.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Infinity staleTime as we handle halted state JIT
    staleTime: Infinity,
  })

  const queries = useMemo(() => {
    if (!pools) return []
    if (!thorchainMimirTimes) return []

    return pools
      .map(pool => {
        const assetId = thorPoolAssetIdToAssetId(pool.asset)

        if (!assetId) return null

        return {
          ...reactQueries.thorchainLp.userLpData(assetId, currentWalletId, walletAccountIds),
          enabled: Boolean(isSuccess && currentWalletId && isThorchainMimirTimesSuccess),
          // We may or may not want to revisit this, but this will prevent overfetching for now
          staleTime: Infinity,
          queryFn: async () => {
            const assetAccountIds = findAccountsByAssetId(portfolioAccounts, assetId)
            const accountIds = assetAccountIds.concat(runeAccountIds)

            return (
              await Promise.all(
                accountIds.map(accountId =>
                  queryClient.fetchQuery(
                    reactQueries.thorchainLp.liquidityProviderPosition({ accountId, assetId }),
                  ),
                ),
              )
            )
              .flat()
              .filter(isSome)
          },
          select: (positions: Position[] | undefined) => {
            // Get fresh state from store to avoid stale closures in react-query select callbacks
            const state = store.getState()
            const assets = selectAssets(state)
            const marketDataUserCurrency = selectMarketDataUserCurrency(state)
            const runeMarketDataUserCurrency = selectMarketDataByAssetIdUserCurrency(
              state,
              thorchainAssetId,
            )

            return {
              assetId,
              positions: (positions ?? [])
                .map(position =>
                  getUserLpDataPosition({
                    assetId,
                    assetPrice: marketDataUserCurrency[assetId]?.price ?? '0',
                    assets,
                    pool,
                    position,
                    runePrice: runeMarketDataUserCurrency?.price,
                    liquidityLockupTime: thorchainMimirTimes.liquidityLockupTime,
                  }),
                )
                .filter(isSome),
            }
          },
        }
      })
      .filter(isSome)
  }, [
    currentWalletId,
    isSuccess,
    isThorchainMimirTimesSuccess,
    pools,
    portfolioAccounts,
    queryClient,
    runeAccountIds,
    thorchainMimirTimes,
    walletAccountIds,
  ])

  // We do not expose this as-is, but mapReduce the queries to massage *all* data, in addition to *each* query having its selector
  const _userLpDataQueries = useQueries({
    // @ts-ignore useQueries isn't strongly typed :(
    queries,
  }) as UseQueryResult<UseAllUserLpDataReturn | null>[]

  // Massage queries data to dedupe opportunities
  // i.e for sym, positions will be present in both the asset and RUNE address members
  const result = useMemo(() => {
    const seenAccountOpportunities = new Set()

    const dedupedDataQueries = _userLpDataQueries.map(queryResult => {
      // No-op. No data, no massaging.
      if (!queryResult.data) {
        return queryResult
      }

      const dedupedPositions = queryResult.data.positions.filter(position => {
        const compositeKey = `${position.opportunityId}*${position.runeAddress}*${position.assetAddress}`

        if (seenAccountOpportunities.has(compositeKey)) {
          // The magic - we've seen this OpportunityId for thie asset address and RUNE address already
          return false
        }

        // Mark this opportunityId as seen for thie asset address and RUNE address, and include the position
        seenAccountOpportunities.add(compositeKey)
        return true
      })

      return {
        ...queryResult,
        data: {
          ...queryResult.data,
          positions: dedupedPositions,
        },
      }
    })

    return dedupedDataQueries
  }, [_userLpDataQueries])

  return result
}
