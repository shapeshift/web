import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { bn } from 'lib/bignumber/bignumber'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { calculatePoolOwnershipPercentage, getCurrentValue } from 'lib/utils/thorchain/lp'
import type { Position, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { findAccountsByAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectMarketDataById,
  selectPortfolioAccounts,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectWalletId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseAllUserLpDataReturn = {
  assetId: AssetId
  positions: UserLpDataPosition[]
}

export const useAllUserLpData = ({
  assetIds,
}: {
  assetIds: AssetId[]
}): UseQueryResult<UseAllUserLpDataReturn | null>[] => {
  const queryClient = useQueryClient()
  const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))
  const currentWalletId = useAppSelector(selectWalletId)

  const { data: availableThornodePools, isSuccess: isAvailableThornodePoolsDataLoaded } = useQuery({
    ...reactQueries.thornode.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // Infinity staleTime as we handle halted state JIT
    staleTime: Infinity,
    select: pools => pools.filter(pool => pool.status === 'Available'),
  })

  const { data: allMidgardPools, isSuccess: isMidgardPoolsDataLoaded } = useQuery({
    ...reactQueries.midgard.poolsData(),
  })
  const queries = useMemo(
    () =>
      assetIds.map(assetId => {
        const poolAssetId = assetIdToPoolAssetId({ assetId })
        return {
          ...reactQueries.thorchainLp.userLpData(assetId, currentWalletId),
          enabled: Boolean(
            isAvailableThornodePoolsDataLoaded &&
              isMidgardPoolsDataLoaded &&
              availableThornodePools?.find(pool => pool.asset === poolAssetId) &&
              allMidgardPools?.find(pool => pool.asset === poolAssetId) &&
              currentWalletId,
          ),
          // We may or may not want to revisit this, but this will prevent overfetching for now
          staleTime: Infinity,
          queryFn: async () => {
            const assetAccountIds = findAccountsByAssetId(portfolioAccounts, assetId)
            const runeAccountIds = findAccountsByAssetId(portfolioAccounts, thorchainAssetId)
            const accountIds = assetAccountIds.concat(runeAccountIds)

            const allPositions = (
              await Promise.all(
                accountIds.map(accountId =>
                  queryClient.fetchQuery(
                    reactQueries.thorchainLp.liquidityProviderPosition({ accountId, assetId }),
                  ),
                ),
              )
            )
              .flat()
              .filter(Boolean)

            return allPositions
          },
          select: (positions: Position[] | undefined) => {
            return {
              assetId,
              positions: (positions ?? [])
                .map(position => {
                  if (!(assetId && availableThornodePools && allMidgardPools)) return null

                  const thornodePoolData = availableThornodePools.find(
                    pool => pool.asset === position.pool,
                  )
                  const midgardPoolData = allMidgardPools.find(pool => pool.asset === position.pool)

                  if (!thornodePoolData || !midgardPoolData) return null

                  const currentValue = getCurrentValue(
                    position.liquidityUnits,
                    thornodePoolData.pool_units,
                    midgardPoolData.assetDepth,
                    midgardPoolData.runeDepth,
                  )

                  const poolAssetMarketData = marketData[assetId] ?? defaultMarketData

                  const isAsymmetric = position.runeAddress === '' || position.assetAddress === ''
                  const asymSide = (() => {
                    if (position.runeAddress === '') return AsymSide.Asset
                    if (position.assetAddress === '') return AsymSide.Rune
                    return null
                  })()

                  return {
                    dateFirstAdded: position.dateFirstAdded,
                    liquidityUnits: position.liquidityUnits,
                    underlyingAssetAmountCryptoPrecision: currentValue.asset,
                    underlyingRuneAmountCryptoPrecision: currentValue.rune,
                    isAsymmetric,
                    asymSide,
                    underlyingAssetValueFiatUserCurrency: bn(currentValue.asset)
                      .times(poolAssetMarketData?.price || 0)
                      .toFixed(),
                    underlyingRuneValueFiatUserCurrency: bn(currentValue.rune)
                      .times(runeMarketData?.price || 0)
                      .toFixed(),
                    totalValueFiatUserCurrency: bn(currentValue.asset)
                      .times(poolAssetMarketData?.price || 0)
                      .plus(bn(currentValue.rune).times(runeMarketData?.price || 0))
                      .toFixed(),
                    poolOwnershipPercentage: calculatePoolOwnershipPercentage({
                      userLiquidityUnits: position.liquidityUnits,
                      totalPoolUnits: thornodePoolData.pool_units,
                    }),
                    opportunityId: `${assetId}*${asymSide ?? 'sym'}`,
                    poolShare: currentValue.poolShare,
                    accountId: position.accountId,
                    assetId,
                    runeAddress: position.runeAddress,
                    assetAddress: position.assetAddress,
                  }
                })
                .filter(isSome),
            }
          },
        }
      }),
    [
      assetIds,
      currentWalletId,
      isAvailableThornodePoolsDataLoaded,
      isMidgardPoolsDataLoaded,
      availableThornodePools,
      allMidgardPools,
      portfolioAccounts,
      queryClient,
      marketData,
      runeMarketData?.price,
    ],
  )
  // We do not expose this as-is, but mapReduce the queries to massage *all* data, in addition to *each* query having its selector
  const _userLpDataQueries = useQueries({
    // @ts-ignore useQueries isn't strongly typed :(
    queries,
  }) as UseQueryResult<UseAllUserLpDataReturn | null>[]

  // Massage queries data to dedupe opportunities
  // i.e for sym, positions will be present in both the asset and RUNE address members
  const userLpDataQueries = useMemo(() => {
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

  return userLpDataQueries
}
