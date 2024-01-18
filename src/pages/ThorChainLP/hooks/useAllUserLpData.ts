import { type AccountId, type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import type {
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import {
  calculatePoolOwnershipPercentage,
  getCurrentValue,
  getThorchainLiquidityProviderPosition,
} from 'lib/utils/thorchain/lp'
import type { UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide, type MidgardPool } from 'lib/utils/thorchain/lp/types'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { findAccountsByAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectMarketDataById,
  selectPortfolioAccounts,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseUserLpDataReturn = {
  assetId: AssetId
  positions: UserLpDataPosition[]
}

export const useAllUserLpData = ({
  assetIds,
}: {
  assetIds: AssetId[]
}): UseQueryResult<UseUserLpDataReturn | null>[] => {
  const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: allThornodePools, isSuccess: isThornodePoolsDataLoaded } = useQuery({
    queryKey: ['thornodePoolData'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await axios.get<ThornodePoolResponse[]>(
        `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
      )
      return data
    },
  })

  const { data: allMidgardPools, isSuccess: isMidgardPoolsDataLoaded } = useQuery({
    queryKey: ['midgardPoolData'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await axios.get<MidgardPoolResponse[]>(
        `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
      )
      return data
    },
  })
  const queries = useMemo(
    () =>
      assetIds.map(assetId => {
        const poolAssetId = assetIdToPoolAssetId({ assetId })
        return {
          enabled: Boolean(
            isThornodePoolsDataLoaded &&
              isMidgardPoolsDataLoaded &&
              allThornodePools?.find(pool => pool.asset === poolAssetId) &&
              allMidgardPools?.find(pool => pool.asset === poolAssetId),
          ),
          queryKey: ['thorchainUserLpData', { assetId }],
          // We may or may not want to revisit this, but this will prevent overfetching for now
          staleTime: Infinity,
          queryFn: async () => {
            const assetAccountIds = findAccountsByAssetId(portfolioAccounts, assetId)
            const runeAccountIds = findAccountsByAssetId(portfolioAccounts, thorchainAssetId)
            const accountIds = assetAccountIds.concat(runeAccountIds)

            const allPositions = (
              await Promise.all(
                accountIds.map(accountId =>
                  getThorchainLiquidityProviderPosition({ accountId, assetId }),
                ),
              )
            )
              .flat()
              .filter(Boolean)

            return allPositions
          },
          select: (positions: (MidgardPool & { accountId: AccountId })[] | undefined) => {
            return {
              assetId,
              positions: (positions ?? [])
                .map(position => {
                  if (!(assetId && allThornodePools && allMidgardPools)) return null

                  const thornodePoolData = allThornodePools.find(
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
                  }
                })
                .filter(isSome),
            }
          },
        }
      }),
    [
      allMidgardPools,
      allThornodePools,
      assetIds,
      isMidgardPoolsDataLoaded,
      isThornodePoolsDataLoaded,
      marketData,
      portfolioAccounts,
      runeMarketData?.price,
    ],
  )
  // We do not expose this as-is, but mapReduce the queries to massage *all* data, in addition to *each* query having its selector
  const _userLpDataQueries = useQueries({
    // @ts-ignore useQueries isn't strongly typed :(
    queries,
  }) as UseQueryResult<UseUserLpDataReturn | null>[]

  // Massage queries data to dedupe opportunities
  // e.g if a user has an asset sym and a RUNE opportunity, their position will be present in both the asset and RUNE address members
  const userLpDataQueries = useMemo(() => {
    const seenOpportunityIds = new Set()

    const dedupedDataQueries = _userLpDataQueries.map(queryResult => {
      // No-op. No data, no massaging.
      if (!queryResult.data) {
        return queryResult
      }

      const dedupedPositions = queryResult.data.positions.filter(position => {
        if (seenOpportunityIds.has(position.opportunityId)) {
          // The magic - we've seen this OpportunityId already
          // TODO(gomes): this won't work for multi-account. We can't use AccountId as a discriminator either because it will be a diff. one when fetched from the asset and ROON side
          // We need to expose runeAddress and assetAddress properties and do some rambo serializing here to be futureproof
          return false
        }

        // Mark this opportunityId as seen and include the position
        seenOpportunityIds.add(position.opportunityId)
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
