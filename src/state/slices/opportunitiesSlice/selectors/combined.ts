import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import isEmpty from 'lodash/isEmpty'
import { matchSorter } from 'match-sorter'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectChainIdParamFromFilter,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectSearchQueryFromFilter,
} from 'state/selectors'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { getFeeAssetByChainId } from 'state/slices/assetsSlice/utils'

import type {
  AggregatedOpportunitiesByAssetIdReturn,
  AggregatedOpportunitiesByProviderReturn,
  LpEarnOpportunityType,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { getOpportunityAccessor, getUnderlyingAssetIdsBalances } from '../utils'
import { selectAssets } from './../../assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from './../../marketDataSlice/selectors'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from './stakingSelectors'

const makeClaimableStakingRewardsAmountFiat = ({
  assets,
  maybeStakingOpportunity,
  marketData,
}: {
  assets: Partial<Record<AssetId, Asset>>
  marketData: Partial<Record<AssetId, MarketData>>
  maybeStakingOpportunity: StakingEarnOpportunityType | LpEarnOpportunityType
}): number => {
  if (maybeStakingOpportunity.type !== DefiType.Staking) return 0

  const stakingOpportunity = maybeStakingOpportunity as StakingEarnOpportunityType

  const rewardsAmountFiat = Array.from(stakingOpportunity.rewardAssetIds ?? []).reduce(
    (sum, assetId, index) => {
      const asset = assets[assetId]
      if (!asset) return sum
      const marketDataPrice = marketData[assetId]?.price
      const amountCryptoBaseUnit = stakingOpportunity?.rewardsCryptoBaseUnit?.amounts[index]
      const cryptoAmountPrecision = bnOrZero(
        stakingOpportunity?.rewardsCryptoBaseUnit?.claimable ? amountCryptoBaseUnit : '0',
      ).div(bnOrZero(10).pow(asset?.precision))

      return bnOrZero(cryptoAmountPrecision)
        .times(marketDataPrice ?? 0)
        .plus(bnOrZero(sum))
        .toNumber()
    },
    0,
  )

  return rewardsAmountFiat
}
export const selectAggregatedEarnOpportunitiesByAssetId = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataSortedByMarketCap,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectChainIdParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
    chainId,
  ): AggregatedOpportunitiesByAssetIdReturn[] => {
    const combined = [...userStakingOpportunites, ...userLpOpportunities]
    const totalFiatAmountByAssetId: Record<AssetId, BN> = {}
    const projectedAnnualizedYieldByAssetId: Record<AssetId, BN> = {}

    const isActiveOpportunityByAssetId = combined.reduce<Record<AssetId, boolean>>((acc, cur) => {
      const depositKey = getOpportunityAccessor({ provider: cur.provider, type: cur.type })
      const underlyingAssetIds = [cur[depositKey]].flat()
      underlyingAssetIds.forEach(assetId => {
        const asset = assets[assetId]
        if (!asset) return acc

        const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
          ...cur,
          assets,
          marketData,
        })

        const amountFiat =
          cur.type === DefiType.LiquidityPool
            ? underlyingAssetBalances[assetId].fiatAmount
            : cur.fiatAmount

        const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
          maybeStakingOpportunity: cur,
          marketData,
          assets,
        })

        if (
          (!includeEarnBalances && !includeRewardsBalances && bnOrZero(amountFiat).gt(0)) ||
          (includeEarnBalances && bnOrZero(amountFiat).gt(0)) ||
          (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))
        ) {
          acc[assetId] = true
          return acc
        }
      })

      return acc
    }, {})

    const byAssetId = combined.reduce<Record<AssetId, AggregatedOpportunitiesByAssetIdReturn>>(
      (acc, cur) => {
        const depositKey = getOpportunityAccessor({ provider: cur.provider, type: cur.type })
        const underlyingAssetIds = [cur[depositKey]].flat()
        if (chainId && cur.chainId !== chainId) return acc
        underlyingAssetIds.forEach(assetId => {
          const isActiveAssetId = isActiveOpportunityByAssetId[assetId]
          if (!acc[assetId]) {
            acc[assetId] = {
              assetId,
              underlyingAssetIds: cur.underlyingAssetIds,
              apy: '0',
              fiatAmount: '0',
              cryptoBalancePrecision: '0',
              fiatRewardsAmount: '0',
              opportunities: {
                staking: [],
                lp: [],
              },
            }
          }
          const asset = assets[assetId]
          if (!asset) return acc

          const underlyingAssetBalances = getUnderlyingAssetIdsBalances({
            ...cur,
            assets,
            marketData,
          })

          const amountFiat =
            cur.type === DefiType.LiquidityPool
              ? underlyingAssetBalances[assetId].fiatAmount
              : cur.fiatAmount

          const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
            maybeStakingOpportunity: cur,
            marketData,
            assets,
          })

          const isActiveOpportunityByFilter =
            (!includeEarnBalances && !includeRewardsBalances) ||
            (includeEarnBalances && bnOrZero(amountFiat).gt(0)) ||
            (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

          acc[assetId].fiatRewardsAmount = bnOrZero(maybeStakingRewardsAmountFiat)
            .plus(acc[assetId].fiatRewardsAmount)
            .toFixed(2)

          if (isActiveOpportunityByFilter) {
            acc[assetId].opportunities[cur.type].push(cur.id as OpportunityId)
          }

          const cryptoBalancePrecision = bnOrZero(cur.cryptoAmountBaseUnit).div(
            bnOrZero(10).pow(asset?.precision).toString(),
          )
          acc[assetId].fiatAmount = bnOrZero(acc[assetId].fiatAmount)
            .plus(bnOrZero(amountFiat))
            .toFixed(2)

          // No active staking for the current AssetId, show the highest APY
          if (!isActiveAssetId) {
            acc[assetId].apy = BigNumber.maximum(acc[assetId].apy, cur.apy).toFixed()
          } else if (isActiveOpportunityByFilter) {
            totalFiatAmountByAssetId[assetId] = bnOrZero(totalFiatAmountByAssetId[assetId]).plus(
              amountFiat,
            )
            projectedAnnualizedYieldByAssetId[assetId] = bnOrZero(
              projectedAnnualizedYieldByAssetId[assetId],
            ).plus(bnOrZero(amountFiat).times(cur.apy))
          }

          acc[assetId].cryptoBalancePrecision = bnOrZero(acc[assetId].cryptoBalancePrecision)
            .plus(
              bnOrZero(
                cur.type === DefiType.LiquidityPool
                  ? underlyingAssetBalances[assetId].cryptoBalancePrecision
                  : cryptoBalancePrecision,
              ),
            )
            .toString()
        })
        return acc
      },
      {},
    )

    for (const [assetId, totalVirtualFiatAmount] of Object.entries(totalFiatAmountByAssetId)) {
      // Use the highest APY for inactive opportunities
      if (!isActiveOpportunityByAssetId[assetId]) continue
      const apy = bnOrZero(projectedAnnualizedYieldByAssetId[assetId]).div(totalVirtualFiatAmount)
      byAssetId[assetId].apy = apy.toFixed()
    }

    const aggregatedEarnOpportunitiesByAssetId = Object.values(byAssetId)

    if (!includeEarnBalances && !includeRewardsBalances) return aggregatedEarnOpportunitiesByAssetId

    const withEarnBalances = aggregatedEarnOpportunitiesByAssetId.filter(opportunity =>
      Boolean(includeEarnBalances && bnOrZero(opportunity.fiatAmount).gt(0)),
    )
    const withRewardsBalances = Object.values(byAssetId).filter(opportunity =>
      Boolean(includeRewardsBalances && bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
    )

    return [...withEarnBalances, ...withRewardsBalances]
  },
)

export const selectClaimableRewards = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesWithMetadataByFilter,
  selectAssets,
  selectMarketDataSortedByMarketCap,
  (userStakingOpportunitesWithMetadata, assets, marketData): string => {
    return userStakingOpportunitesWithMetadata
      .reduce<BN>((totalSum, stakingOpportunityWithMetadata) => {
        const rewardsAmountFiat = Array.from(
          stakingOpportunityWithMetadata?.rewardAssetIds ?? [],
        ).reduce((currentSum, assetId, index) => {
          const asset = assets[assetId]
          if (!asset) return currentSum
          const marketDataPrice = marketData[assetId]?.price
          const amountCryptoBaseUnit =
            stakingOpportunityWithMetadata?.rewardsCryptoBaseUnit?.amounts[index]
          const cryptoAmountPrecision = bnOrZero(
            stakingOpportunityWithMetadata?.rewardsCryptoBaseUnit?.claimable
              ? amountCryptoBaseUnit
              : '0',
          ).div(bnOrZero(10).pow(asset?.precision))

          return bnOrZero(cryptoAmountPrecision)
            .times(marketDataPrice ?? 0)
            .plus(bnOrZero(currentSum))
            .toNumber()
        }, 0)
        totalSum = bnOrZero(totalSum).plus(rewardsAmountFiat)
        return totalSum
      }, bn(0))
      .toFixed()
  },
)

export const selectOpportunityApiPending = (state: ReduxState) =>
  Object.values(state.opportunitiesApi.queries).some(query => query?.status === QueryStatus.pending)

export const selectAggregatedEarnOpportunitiesByProvider = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataSortedByMarketCap,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectChainIdParamFromFilter,
  selectSearchQueryFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketData,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
    chainId,
    searchQuery,
  ): AggregatedOpportunitiesByProviderReturn[] => {
    if (isEmpty(marketData)) return []
    const totalFiatAmountByProvider = {} as Record<DefiProvider, BN>
    const projectedAnnualizedYieldByProvider = {} as Record<DefiProvider, BN>
    const combined = userStakingOpportunites.concat(userLpOpportunities)

    /**
     * we want to be able to search on...
     * - provider "thorch" for THORChain, "unis" for Uniswap
     * - asset name (vault/underlying/rewards) e.g. idle 'senior tr' for Idle Senior TR, 'usdc' will match too
     * - chain "opt" for Optimism
     *
     * https://github.com/kentcdodds/match-sorter#advanced-options
     *
     * we are using the function style advanced filtering of match-sorter to map
     * - assetId -> asset name
     * - chainId -> chain name
     * - rewardAssetIds[] - asset name[]
     * - underlyingAssetIds[] - asset name[]
     *
     * - if we include a search term, we want to match on any of these
     * - if we don't include a search term, return all
     *
     * the search should resolve more broadly than narrowly, e.g.
     * i search for "compound" - i should see all compound vaults, not just the one i'm looking for
     */

    const searchOpportunities = <T extends LpEarnOpportunityType | StakingEarnOpportunityType>(
      searchQuery: string | undefined,
      combined: T[],
      assets: AssetsById,
    ): T[] => {
      if (!searchQuery) return combined

      return matchSorter(combined, searchQuery, {
        keys: [
          'name',
          'provider',
          'opportunityName',
          'version',
          ({ assetId }) => [assets[assetId]?.name, assets[assetId]?.symbol].join(' '),
          ({ underlyingAssetId }) =>
            [assets[underlyingAssetId]?.name, assets[underlyingAssetId]?.symbol].join(' '),
          ({ chainId }) => {
            const maybeFeeAsset = getFeeAssetByChainId(assets, chainId)
            if (!maybeFeeAsset) return ''
            const { name, symbol, networkName } = maybeFeeAsset
            return [name, symbol, networkName].join(' ')
          },
          item =>
            item.rewardAssetIds
              .map((id: AssetId) => {
                const maybeAsset = assets[id]
                if (!maybeAsset) return ''
                const { name, symbol } = maybeAsset
                return [name, symbol].join(' ')
              })
              .join(' '),
          item =>
            item.underlyingAssetIds
              .map((id: AssetId) => {
                const maybeAsset = assets[id]
                if (!maybeAsset) return ''
                const { name, symbol } = maybeAsset
                return [name, symbol].join(' ')
              })
              .join(' '),
          item => (item?.tags ?? []).join(' '),
        ],
        threshold: matchSorter.rankings.CONTAINS,
      })
    }

    const filtered = searchOpportunities(searchQuery, combined, assets)

    const makeEmptyPayload = (provider: DefiProvider): AggregatedOpportunitiesByProviderReturn => ({
      provider,
      apy: '0',
      fiatAmount: '0',
      fiatRewardsAmount: '0',
      netProviderFiatAmount: '0',
      opportunities: {
        lp: [],
        staking: [],
      },
    })

    const initial = {
      [DefiProvider.Idle]: makeEmptyPayload(DefiProvider.Idle),
      [DefiProvider.Yearn]: makeEmptyPayload(DefiProvider.Yearn),
      [DefiProvider.ShapeShift]: makeEmptyPayload(DefiProvider.ShapeShift),
      [DefiProvider.EthFoxStaking]: makeEmptyPayload(DefiProvider.EthFoxStaking),
      [DefiProvider.UniV2]: makeEmptyPayload(DefiProvider.UniV2),
      [DefiProvider.CosmosSdk]: makeEmptyPayload(DefiProvider.CosmosSdk),
      [DefiProvider.OsmosisLp]: makeEmptyPayload(DefiProvider.OsmosisLp),
      [DefiProvider.ThorchainSavers]: makeEmptyPayload(DefiProvider.ThorchainSavers),
    } as const

    const isActiveStakingByFilter = filtered.reduce<Record<DefiProvider, boolean>>((acc, cur) => {
      const { provider } = cur

      if (chainId && chainId !== cur.chainId) return acc

      const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
        maybeStakingOpportunity: cur,
        marketData,
        assets,
      })

      const isActiveOpportunityByFilter =
        (!includeEarnBalances && !includeRewardsBalances && bnOrZero(cur.fiatAmount).gt(0)) ||
        (includeEarnBalances && bnOrZero(cur.fiatAmount).gt(0)) ||
        (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

      if (isActiveOpportunityByFilter) {
        acc[provider] = true
        return acc
      }

      return acc
    }, {} as Record<DefiProvider, boolean>)

    const byProvider = filtered.reduce<
      Record<DefiProvider, AggregatedOpportunitiesByProviderReturn>
    >((acc, cur) => {
      const { provider } = cur
      const isActiveProvider = isActiveStakingByFilter[provider]

      if (chainId && chainId !== cur.chainId) return acc

      const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountFiat({
        maybeStakingOpportunity: cur,
        marketData,
        assets,
      })

      const isActiveOpportunityByFilter =
        (!includeEarnBalances && !includeRewardsBalances) ||
        (includeEarnBalances && bnOrZero(cur.fiatAmount).gt(0)) ||
        (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))
      // No active staking for the current provider, show the highest APY
      if (!isActiveProvider) {
        acc[provider].apy = BigNumber.maximum(acc[provider].apy, cur.apy).toFixed()
      } else if (isActiveOpportunityByFilter) {
        totalFiatAmountByProvider[provider] = bnOrZero(totalFiatAmountByProvider[provider]).plus(
          cur.fiatAmount,
        )
        projectedAnnualizedYieldByProvider[provider] = bnOrZero(
          projectedAnnualizedYieldByProvider[provider],
        ).plus(bnOrZero(cur.fiatAmount).times(cur.apy))
      }

      if (cur.type === DefiType.LiquidityPool) {
        acc[provider].opportunities.lp.push(cur.id)
      }

      if (isActiveOpportunityByFilter) {
        acc[provider].opportunities.staking.push(cur.id)
      }
      const fiatRewardsAmount = bnOrZero(maybeStakingRewardsAmountFiat)
        .plus(acc[provider].fiatRewardsAmount)
        .toFixed(2)
      acc[provider].fiatRewardsAmount = fiatRewardsAmount
      const fiatAmount = bnOrZero(acc[provider].fiatAmount)
        .plus(bnOrZero(cur.fiatAmount))
        .toFixed(2)
      acc[provider].fiatAmount = fiatAmount

      acc[provider].netProviderFiatAmount = bnOrZero(fiatAmount).plus(fiatRewardsAmount).toFixed(2)

      return acc
    }, initial)

    for (const [provider, totalVirtualFiatAmount] of Object.entries(totalFiatAmountByProvider)) {
      // Use the highest APY for inactive opportunities
      if (!isActiveStakingByFilter[provider as DefiProvider]) continue
      const apy = bnOrZero(projectedAnnualizedYieldByProvider[provider as DefiProvider]).div(
        totalVirtualFiatAmount,
      )
      byProvider[provider as DefiProvider].apy = apy.toFixed()
    }

    const aggregatedEarnOpportunitiesByProvider = Object.values(byProvider).reduce<
      AggregatedOpportunitiesByProviderReturn[]
    >((acc, cur) => {
      if (cur.opportunities.lp.length || cur.opportunities.staking.length) acc.push(cur)
      return acc
    }, [])

    const sortedListByFiatAmount = aggregatedEarnOpportunitiesByProvider.sort((a, b) =>
      bnOrZero(a.netProviderFiatAmount).gte(bnOrZero(b.netProviderFiatAmount)) ? -1 : 1,
    )

    const activeOpportunities = sortedListByFiatAmount.filter(opportunity =>
      bnOrZero(opportunity.netProviderFiatAmount).gt(0),
    )
    const inactiveOpportunities = sortedListByFiatAmount
      .filter(opportunity => bnOrZero(opportunity.netProviderFiatAmount).eq(0))
      .sort((a, b) => (bnOrZero(a.apy).gte(bnOrZero(b.apy)) ? -1 : 1))

    const sortedListByFiatAmountAndApy = activeOpportunities.concat(inactiveOpportunities)

    // No further filtering needed, we want to show all opportunities
    if (!includeEarnBalances && !includeRewardsBalances) return sortedListByFiatAmountAndApy

    const withEarnBalances = Object.values(aggregatedEarnOpportunitiesByProvider).filter(
      opportunity => Boolean(includeEarnBalances && bnOrZero(opportunity.fiatAmount).gt(0)),
    )
    const withRewardsBalances = Object.values(aggregatedEarnOpportunitiesByProvider).filter(
      opportunity =>
        Boolean(includeRewardsBalances && bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
    )

    const results = withEarnBalances.concat(withRewardsBalances)

    const sortedResultsByNetProviderFiatAmount = results.sort((a, b) =>
      bnOrZero(a.netProviderFiatAmount).gte(bnOrZero(b.netProviderFiatAmount)) ? -1 : 1,
    )

    // No sorting by APY needed for the inactive chunks, since there are no active opportunities
    return sortedResultsByNetProviderFiatAmount
  },
)
