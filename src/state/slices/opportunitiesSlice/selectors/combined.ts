import { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, MarketData } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import isEmpty from 'lodash/isEmpty'
import partition from 'lodash/partition'
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
import { getFeeAssetByChainId } from 'state/slices/assetsSlice/utils'

import type {
  AggregatedOpportunitiesByAssetIdReturn,
  AggregatedOpportunitiesByProviderReturn,
  LpEarnOpportunityType,
  OpportunityId,
  StakingEarnOpportunityType,
} from '../types'
import { DefiProvider, DefiType } from '../types'
import { getOpportunityAccessor, getUnderlyingAssetIdsBalances } from '../utils'
import { selectAssets } from './../../assetsSlice/selectors'
import { selectMarketDataUserCurrency } from './../../marketDataSlice/selectors'
import { selectAggregatedEarnUserLpOpportunities } from './lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from './stakingSelectors'

const makeClaimableStakingRewardsAmountUserCurrency = ({
  assets,
  maybeStakingOpportunity,
  marketDataUserCurrency,
}: {
  assets: Partial<Record<AssetId, Asset>>
  marketDataUserCurrency: Partial<Record<AssetId, MarketData>>
  maybeStakingOpportunity: StakingEarnOpportunityType | LpEarnOpportunityType
}): number => {
  if (maybeStakingOpportunity.type !== DefiType.Staking) return 0

  const stakingOpportunity = maybeStakingOpportunity as StakingEarnOpportunityType

  const rewardsAmountUserCurrency = Array.from(stakingOpportunity.rewardAssetIds ?? []).reduce(
    (sum, assetId, index) => {
      const asset = assets[assetId]
      if (!asset) return sum
      const marketDataPrice = marketDataUserCurrency[assetId]?.price
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

  return rewardsAmountUserCurrency
}
export const selectAggregatedEarnOpportunitiesByAssetId = createDeepEqualOutputSelector(
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAggregatedEarnUserLpOpportunities,
  selectMarketDataUserCurrency,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectChainIdParamFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketDataUserCurrency,
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
          marketDataUserCurrency,
        })

        const amountFiat =
          cur.type === DefiType.LiquidityPool
            ? underlyingAssetBalances[assetId].fiatAmount
            : cur.fiatAmount

        const maybeStakingRewardsAmountUserCurrency = makeClaimableStakingRewardsAmountUserCurrency(
          {
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          },
        )

        if (
          (!includeEarnBalances && !includeRewardsBalances && !bnOrZero(amountFiat).isZero()) ||
          (includeEarnBalances && !bnOrZero(amountFiat).isZero()) ||
          (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountUserCurrency).gt(0))
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
            marketDataUserCurrency,
          })

          const amountFiat =
            cur.type === DefiType.LiquidityPool
              ? underlyingAssetBalances[assetId].fiatAmount
              : cur.fiatAmount

          const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountUserCurrency({
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          })

          const isActiveOpportunityByFilter =
            (!includeEarnBalances && !includeRewardsBalances) ||
            (includeEarnBalances && !bnOrZero(amountFiat).isZero()) ||
            (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

          acc[assetId].fiatRewardsAmount = bnOrZero(maybeStakingRewardsAmountFiat)
            .plus(acc[assetId].fiatRewardsAmount)
            .toFixed(2)

          if (isActiveOpportunityByFilter) {
            acc[assetId].opportunities[cur.type].push(cur.id as OpportunityId)
          }

          const cryptoBalancePrecision = bnOrZero(cur.cryptoAmountBaseUnit).div(
            bnOrZero(10)
              .pow(asset?.precision)
              .toString(),
          )
          acc[assetId].fiatAmount = bnOrZero(acc[assetId].fiatAmount)
            .plus(bnOrZero(amountFiat))
            .toFixed(2)

          // No active staking for the current AssetId, show the highest APY
          if (!isActiveAssetId) {
            acc[assetId].apy = BigNumber.maximum(acc[assetId].apy, cur.apy ?? '0').toFixed()
          } else if (isActiveOpportunityByFilter) {
            totalFiatAmountByAssetId[assetId] = bnOrZero(totalFiatAmountByAssetId[assetId]).plus(
              BigNumber.max(amountFiat, 0),
            )
            projectedAnnualizedYieldByAssetId[assetId] = bnOrZero(
              projectedAnnualizedYieldByAssetId[assetId],
            ).plus(BigNumber.max(amountFiat, 0).times(cur.apy ?? '1'))
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

    const sortedAggregatedEarnOpportunitiesByFiatAmount = aggregatedEarnOpportunitiesByAssetId.sort(
      (a, b) => (bnOrZero(a.fiatAmount).gte(bnOrZero(b.fiatAmount)) ? -1 : 1),
    )

    const [activeOpportunities, inactiveOpportunities] = partition(
      sortedAggregatedEarnOpportunitiesByFiatAmount,
      opportunity => !bnOrZero(opportunity.fiatAmount).isZero(),
    )
    inactiveOpportunities.sort((a, b) => (bnOrZero(a.apy).gte(bnOrZero(b.apy)) ? -1 : 1))

    const sortedOpportunitiesByFiatAmountAndApy = activeOpportunities.concat(inactiveOpportunities)

    if (!includeEarnBalances && !includeRewardsBalances)
      return sortedOpportunitiesByFiatAmountAndApy

    const withEarnBalances = aggregatedEarnOpportunitiesByAssetId.filter(opportunity =>
      Boolean(includeEarnBalances && !bnOrZero(opportunity.fiatAmount).isZero()),
    )
    const withRewardsBalances = Object.values(byAssetId).filter(opportunity =>
      Boolean(includeRewardsBalances && bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
    )

    return withEarnBalances.concat(withRewardsBalances)
  },
)

export const selectClaimableRewards = createDeepEqualOutputSelector(
  selectUserStakingOpportunitiesWithMetadataByFilter,
  selectAssets,
  selectMarketDataUserCurrency,
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
  selectMarketDataUserCurrency,
  selectAssets,
  selectIncludeEarnBalancesParamFromFilter,
  selectIncludeRewardsBalancesParamFromFilter,
  selectChainIdParamFromFilter,
  selectSearchQueryFromFilter,
  (
    userStakingOpportunites,
    userLpOpportunities,
    marketDataUserCurrency,
    assets,
    includeEarnBalances,
    includeRewardsBalances,
    chainId,
    searchQuery,
  ): AggregatedOpportunitiesByProviderReturn[] => {
    if (isEmpty(marketDataUserCurrency)) return []
    const totalFiatAmountByProvider: Record<string, BN> = {}
    const projectedAnnualizedYieldByProvider: Record<string, BN> = {}
    const combined = userStakingOpportunites.concat(userLpOpportunities)

    /**
     * we want to be able to search on...
     * - provider "thorch" for THORChain, "unis" for Uniswap
     * - asset name (vault/underlying/rewards) e.g. fox for FOXy
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
      assets: AssetsByIdPartial,
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

    const makeEmptyPayload = (provider: string): AggregatedOpportunitiesByProviderReturn => ({
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
      [DefiProvider.ShapeShift]: makeEmptyPayload(DefiProvider.ShapeShift),
      [DefiProvider.EthFoxStaking]: makeEmptyPayload(DefiProvider.EthFoxStaking),
      [DefiProvider.rFOX]: makeEmptyPayload(DefiProvider.rFOX),
      [DefiProvider.UniV2]: makeEmptyPayload(DefiProvider.UniV2),
      [DefiProvider.CosmosSdk]: makeEmptyPayload(DefiProvider.CosmosSdk),
      [DefiProvider.ThorchainSavers]: makeEmptyPayload(DefiProvider.ThorchainSavers),
    } as const

    const isActiveStakingByFilter = filtered.reduce<Record<string, boolean>>(
      (acc, cur) => {
        const { provider } = cur

        if (chainId && chainId !== cur.chainId) return acc

        const maybeStakingRewardsAmountFiat = makeClaimableStakingRewardsAmountUserCurrency({
          maybeStakingOpportunity: cur,
          marketDataUserCurrency,
          assets,
        })

        const isActiveOpportunityByFilter =
          (!includeEarnBalances && !includeRewardsBalances && !bnOrZero(cur.fiatAmount).isZero()) ||
          (includeEarnBalances && !bnOrZero(cur.fiatAmount).isZero()) ||
          (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountFiat).gt(0))

        if (isActiveOpportunityByFilter) {
          acc[provider] = true
          return acc
        }

        return acc
      },
      {} as Record<DefiProvider, boolean>,
    )

    const byProvider = filtered.reduce<Record<string, AggregatedOpportunitiesByProviderReturn>>(
      (acc, cur) => {
        const { provider } = cur
        if (!acc[provider]) {
          acc[provider] = makeEmptyPayload(provider)
        }
        const isActiveProvider = isActiveStakingByFilter[provider]

        if (chainId && chainId !== cur.chainId) return acc

        const maybeStakingRewardsAmountUserCurrency = makeClaimableStakingRewardsAmountUserCurrency(
          {
            maybeStakingOpportunity: cur,
            marketDataUserCurrency,
            assets,
          },
        )

        const isActiveOpportunityByFilter =
          (!includeEarnBalances && !includeRewardsBalances) ||
          (includeEarnBalances && !bnOrZero(cur.fiatAmount).isZero()) ||
          (includeRewardsBalances && bnOrZero(maybeStakingRewardsAmountUserCurrency).gt(0))
        // No active staking for the current provider, show the highest APY
        if (!isActiveProvider) {
          acc[provider].apy = BigNumber.maximum(acc[provider].apy, cur.apy ?? '0').toFixed()
        } else if (isActiveOpportunityByFilter) {
          totalFiatAmountByProvider[provider] = bnOrZero(totalFiatAmountByProvider[provider]).plus(
            BigNumber.max(cur.fiatAmount, 0),
          )
          projectedAnnualizedYieldByProvider[provider] = bnOrZero(
            projectedAnnualizedYieldByProvider[provider],
          ).plus(BigNumber.max(cur.fiatAmount, 0).times(cur.apy ?? '1'))
        }

        if (cur.type === DefiType.LiquidityPool) {
          acc[provider].opportunities.lp.push(cur.id)
        }

        if (cur.type === DefiType.Staking && isActiveOpportunityByFilter) {
          acc[provider].opportunities.staking.push(cur.id)
        }
        const userCurrencyRewardsAmount = bnOrZero(maybeStakingRewardsAmountUserCurrency)
          .plus(acc[provider].fiatRewardsAmount)
          .toFixed(2)
        acc[provider].fiatRewardsAmount = userCurrencyRewardsAmount
        const fiatAmount = bnOrZero(acc[provider].fiatAmount)
          .plus(bnOrZero(cur.fiatAmount))
          .toFixed(2)
        acc[provider].fiatAmount = fiatAmount

        acc[provider].netProviderFiatAmount = bnOrZero(fiatAmount)
          .plus(userCurrencyRewardsAmount)
          .toFixed(2)

        return acc
      },
      initial,
    )

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

    const [activeOpportunities, inactiveOpportunities] = partition(
      sortedListByFiatAmount,
      opportunity => !bnOrZero(opportunity.netProviderFiatAmount).isZero(),
    )
    inactiveOpportunities.sort((a, b) => (bnOrZero(a.apy).gte(bnOrZero(b.apy)) ? -1 : 1))

    const sortedListByFiatAmountAndApy = activeOpportunities.concat(inactiveOpportunities)

    // No further filtering needed, we want to show all opportunities
    if (!includeEarnBalances && !includeRewardsBalances) return sortedListByFiatAmountAndApy

    const withEarnBalances = Object.values(aggregatedEarnOpportunitiesByProvider).filter(
      opportunity => Boolean(includeEarnBalances && !bnOrZero(opportunity.fiatAmount).isZero()),
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
