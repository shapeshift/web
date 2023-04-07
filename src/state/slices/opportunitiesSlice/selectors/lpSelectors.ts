import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { AssetWithBalance } from 'features/defi/components/Overview/Overview'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectLpIdParamFromFilter } from 'state/selectors'

import { selectAssets } from '../../assetsSlice/selectors'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '../../common-selectors'
import { selectMarketDataSortedByMarketCap } from '../../marketDataSlice/selectors'
import { getUnderlyingAssetIdsBalances } from '../utils'
import type { LpEarnOpportunityType, StakingEarnOpportunityType } from './../types'

export const selectLpOpportunitiesByAccountId = (state: ReduxState) =>
  state.opportunities.lp.byAccountId
export const selectLpOpportunitiesById = (state: ReduxState) => state.opportunities.lp.byId

// A user LpOpportunity, parsed as an EarnOpportunityType
// TODO: testme
export const selectEarnUserLpOpportunity = createDeepEqualOutputSelector(
  selectLpOpportunitiesById,
  selectLpIdParamFromFilter,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectAssets,
  selectMarketDataSortedByMarketCap,
  (
    lpOpportunitiesById,
    lpId,
    lpAssetBalanceCryptoBaseUnit,
    assets,
    marketData,
  ): LpEarnOpportunityType | undefined => {
    if (!lpId) return

    const marketDataPrice = marketData[lpId as AssetId]?.price
    const opportunityMetadata = lpOpportunitiesById[lpId]

    if (!opportunityMetadata) return

    const [underlyingToken0AmountCryptoBaseUnit, underlyingToken1AmountCryptoBaseUnit] =
      opportunityMetadata?.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(lpAssetBalanceCryptoBaseUnit)
          .times(opportunityMetadata?.underlyingAssetRatiosBaseUnit[i])
          .div(bn(10).pow(bnOrZero(assets[assetId]?.precision)))
          .toFixed(6),
      )

    const opportunity = {
      ...opportunityMetadata,
      opportunityName: opportunityMetadata.name,
      isLoaded: true,
      contractAddress: fromAssetId(lpId as AssetId).assetReference,
      chainId: fromAssetId(lpId as AssetId).chainId,
      underlyingToken0AmountCryptoBaseUnit,
      underlyingToken1AmountCryptoBaseUnit,
      cryptoAmountBaseUnit: lpAssetBalanceCryptoBaseUnit,
      cryptoAmountPrecision: bnOrZero(lpAssetBalanceCryptoBaseUnit)
        .div(bn(10).pow(bnOrZero(assets[opportunityMetadata?.assetId]?.precision)))
        .toFixed(),
      fiatAmount: bnOrZero(lpAssetBalanceCryptoBaseUnit)
        .div(bn(10).pow(bnOrZero(assets[opportunityMetadata?.assetId]?.precision)))
        .times(marketDataPrice ?? '0')
        .toString(),
      icons: opportunityMetadata.underlyingAssetIds
        .map(assetId => assets[assetId]?.icon)
        .map(icon => icon ?? ''),
    }

    return opportunity
  },
)

// The same as the previous selector, but parsed as an EarnOpportunityType
// TODO: testme
export const selectAggregatedEarnUserLpOpportunity = createDeepEqualOutputSelector(
  selectLpOpportunitiesById,
  selectLpIdParamFromFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectAssets,
  selectMarketDataSortedByMarketCap,
  (
    lpOpportunitiesById,
    lpId,
    aggregatedLpAssetBalance,
    assets,
    marketData,
  ): StakingEarnOpportunityType | undefined => {
    if (!lpId || !aggregatedLpAssetBalance) return

    const marketDataPrice = marketData[lpId as AssetId]?.price
    const opportunityMetadata = lpOpportunitiesById[lpId]

    if (!opportunityMetadata) return

    const [underlyingToken0AmountCryptoBaseUnit, underlyingToken1AmountCryptoBaseUnit] =
      opportunityMetadata.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(aggregatedLpAssetBalance)
          .times(opportunityMetadata?.underlyingAssetRatiosBaseUnit[i] ?? '0')
          .div(bn(10).pow(bnOrZero(assets[assetId]?.precision)))
          .toFixed(6)
          .toString(),
      )

    const opportunity = {
      ...opportunityMetadata,
      isLoaded: true,
      contractAddress: fromAssetId(lpId as AssetId).assetReference,
      chainId: fromAssetId(lpId as AssetId).chainId,
      underlyingToken0AmountCryptoBaseUnit,
      underlyingToken1AmountCryptoBaseUnit,
      cryptoAmountPrecision: aggregatedLpAssetBalance,
      // TODO(gomes): use base unit as source of truth, conversions back and forth are unsafe
      cryptoAmountBaseUnit: toBaseUnit(aggregatedLpAssetBalance, assets[lpId]?.precision ?? 0),
      fiatAmount: bnOrZero(aggregatedLpAssetBalance)
        .times(marketDataPrice ?? '0')
        .toString(),
      icons: opportunityMetadata.underlyingAssetIds
        .map(assetId => assets[assetId]?.icon)
        .map(icon => icon ?? ''),
      opportunityName: opportunityMetadata.name,
    }

    return opportunity
  },
)

// Useful when multiple accounts are staked on the same opportunity, so we can detect the highest staked balance one
export const selectHighestBalanceAccountIdByLpId = createSelector(
  selectPortfolioAccountBalancesBaseUnit,
  selectLpIdParamFromFilter,
  (portfolioAccountBalances, lpId): AccountId | undefined => {
    if (!lpId) return '*' // Narrowing flavoured type

    const foundEntries = Object.entries(portfolioAccountBalances)
      .filter(([, byAccountId]) => byAccountId.hasOwnProperty(lpId))
      .sort(([, a], [, b]) =>
        // In the case of EVM chain LPing, the LpId actually is an AssetId
        // Note that this may not hold true for the concept of "LPing" on other chains, hence the type assertion
        // In case we get an LpId that's not an AssetId, we'll have to implement custom logic for it
        // This is NOT a full LP abstraction, and for all intents and purposes is assuming the LP as token i.e an AssetId in portfolio, not an IOU
        bn(b[lpId as AssetId])
          .minus(a[lpId as AssetId])
          .toNumber(),
      )[0]

    // Chainable methods that produce an iterable screw the narrowed type back to string
    const foundAccountId: AccountId = foundEntries?.[0]

    return foundAccountId
  },
)

export const selectUnderlyingLpAssetsWithBalancesAndIcons = createSelector(
  selectLpIdParamFromFilter,
  selectLpOpportunitiesById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectAssets,
  selectMarketDataSortedByMarketCap,
  (
    lpId,
    lpOpportunitiesById,
    lpAssetBalancePrecision,
    assets,
    marketData,
  ): AssetWithBalance[] | undefined => {
    if (!lpId) return
    const opportunityMetadata = lpOpportunitiesById[lpId]

    if (!opportunityMetadata) return
    const lpAsset = assets[lpId]
    if (!lpAsset) return

    const underlyingBalances = getUnderlyingAssetIdsBalances({
      cryptoAmountBaseUnit: bnOrZero(lpAssetBalancePrecision)
        .times(bnOrZero(10).pow(lpAsset.precision))
        .toString(),
      underlyingAssetIds: opportunityMetadata.underlyingAssetIds,
      underlyingAssetRatiosBaseUnit: opportunityMetadata.underlyingAssetRatiosBaseUnit,
      assets,
      assetId: lpId,
      marketData,
    })
    const underlyingAssetsIcons = opportunityMetadata.underlyingAssetIds
      .map(assetId => assets[assetId]?.icon)
      .filter(isSome)
    return opportunityMetadata.underlyingAssetIds
      .map((assetId, i) => {
        const asset = assets[assetId]
        return asset
          ? {
              ...asset,
              cryptoBalancePrecision: underlyingBalances[assetId].cryptoBalancePrecision,
              icons: [underlyingAssetsIcons[i]],
              allocationPercentage: '0.50',
            }
          : undefined
      })
      .filter(isSome)
  },
)

/* Get LP opportunities for all assets with balance data aggregated across all accounts */
export const selectAggregatedEarnUserLpOpportunities = createDeepEqualOutputSelector(
  selectLpOpportunitiesById,
  selectPortfolioAssetBalancesBaseUnit,
  selectAssets,
  selectMarketDataSortedByMarketCap,
  (
    lpOpportunitiesById,
    portfolioAssetBalancesById,
    assets,
    marketData,
  ): LpEarnOpportunityType[] => {
    const opportunities: LpEarnOpportunityType[] = []

    if (!portfolioAssetBalancesById) return opportunities

    for (const [lpId, opportunityMetadata] of Object.entries(lpOpportunitiesById)) {
      if (!opportunityMetadata) continue

      const marketDataPrice = marketData[lpId as AssetId]?.price
      const aggregatedLpAssetBalance = portfolioAssetBalancesById[lpId]

      /* Get amounts of each underlying token (in base units, eg. wei) */
      /* TODO:(pastaghost) Generalize this (and LpEarnOpportunityType) so that number of underlying assets is not assumed to be 2. */
      const [underlyingToken0AmountCryptoBaseUnit, underlyingToken1AmountCryptoBaseUnit] =
        opportunityMetadata.underlyingAssetIds.map((assetId, i) =>
          bnOrZero(aggregatedLpAssetBalance)
            .times(opportunityMetadata?.underlyingAssetRatiosBaseUnit[i] ?? '0')
            .div(bn(10).pow(bnOrZero(assets[assetId]?.precision)))
            .toFixed(6)
            .toString(),
        )

      /* Transform data into LpEarnOpportunityType */
      const opportunity: LpEarnOpportunityType = {
        ...opportunityMetadata,
        isLoaded: true,
        chainId: fromAssetId(lpId as AssetId).chainId,
        underlyingToken0AmountCryptoBaseUnit,
        underlyingToken1AmountCryptoBaseUnit,
        cryptoAmountPrecision: bnOrZero(aggregatedLpAssetBalance)
          .div(bn(10).pow(assets[lpId]?.precision ?? '0'))
          .toString(),
        // TODO(gomes): use base unit as source of truth, conversions back and forth are unsafe
        cryptoAmountBaseUnit: aggregatedLpAssetBalance,
        fiatAmount: bnOrZero(aggregatedLpAssetBalance)
          .times(marketDataPrice ?? '0')
          .div(bn(10).pow(assets[lpId]?.precision ?? '0'))
          .toString(),
        icons: opportunityMetadata.underlyingAssetIds
          .map(assetId => assets[assetId]?.icon)
          .map(icon => icon ?? ''),
        opportunityName: opportunityMetadata.name,
        rewardAddress: '',
      }

      opportunities.push(opportunity)
    }

    return opportunities
  },
)

export const selectActiveAggregatedEarnUserLpOpportunities = createDeepEqualOutputSelector(
  selectAggregatedEarnUserLpOpportunities,
  (aggregatedUserStakingOpportunities): LpEarnOpportunityType[] =>
    aggregatedUserStakingOpportunities.filter(opportunity =>
      bnOrZero(opportunity.fiatAmount).gt(0),
    ),
)
