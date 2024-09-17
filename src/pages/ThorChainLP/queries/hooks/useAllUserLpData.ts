import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { poolAssetIdToAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { isSome } from 'lib/utils'
import { THORCHAIN_BLOCK_TIME_SECONDS, thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'
import type { Position, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { findAccountsByAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssets,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataUserCurrency,
  selectPortfolioAccounts,
  selectWalletId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { getUserLpDataPosition } from './useUserLpData'

type UseAllUserLpDataReturn = {
  assetId: AssetId
  positions: UserLpDataPosition[]
}

export const useAllUserLpData = (): UseQueryResult<UseAllUserLpDataReturn | null>[] => {
  const queryClient = useQueryClient()
  const assets = useAppSelector(selectAssets)
  const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const runeAccountIds = findAccountsByAssetId(portfolioAccounts, thorchainAssetId)
  const marketDataUserCurrency = useAppSelector(selectMarketDataUserCurrency)
  const runeMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const currentWalletId = useAppSelector(selectWalletId)

  const liquidityLockupTime = useQuery({
    ...reactQueries.thornode.mimir(),
    staleTime: thorchainBlockTimeMs,
    select: mimirData => {
      const liquidityLockupBlocks = mimirData.LIQUIDITYLOCKUPBLOCKS as number | undefined
      return Number(bnOrZero(liquidityLockupBlocks).times(THORCHAIN_BLOCK_TIME_SECONDS).toFixed(0))
    },
  })

  const { data: pools, isSuccess } = useQuery({
    ...reactQueries.thornode.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Infinity staleTime as we handle halted state JIT
    staleTime: Infinity,
  })

  const queries = useMemo(() => {
    if (!pools) return []
    if (!liquidityLockupTime.data) return []

    return pools
      .map(pool => {
        const assetId = poolAssetIdToAssetId(pool.asset)

        if (!assetId) return null

        return {
          ...reactQueries.thorchainLp.userLpData(assetId, currentWalletId),
          enabled: Boolean(isSuccess && currentWalletId && liquidityLockupTime.isSuccess),
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
                    runePrice: runeMarketDataUserCurrency.price,
                    liquidityLockupTime: liquidityLockupTime.data,
                  }),
                )
                .filter(isSome),
            }
          },
        }
      })
      .filter(isSome)
  }, [
    pools,
    liquidityLockupTime,
    currentWalletId,
    isSuccess,
    portfolioAccounts,
    runeAccountIds,
    queryClient,
    marketDataUserCurrency,
    assets,
    runeMarketDataUserCurrency.price,
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
