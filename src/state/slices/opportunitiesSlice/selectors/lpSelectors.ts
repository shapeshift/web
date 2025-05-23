import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import partition from 'lodash/partition'

import { selectAssets } from '../../assetsSlice/selectors'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '../../common-selectors'
import { selectMarketDataUserCurrency } from '../../marketDataSlice/selectors'
import { opportunities } from '../opportunitiesSlice'
import { getUnderlyingAssetIdsBalances } from '../utils'
import type { LpEarnOpportunityType } from './../types'

import type { AssetWithBalance } from '@/features/defi/components/Overview/Overview'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isSome } from '@/lib/utils'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectLpIdParamFromFilter,
} from '@/state/selectors'

// A user LpOpportunity, parsed as an EarnOpportunityType
// TODO: testme
export const selectEarnUserLpOpportunity = createDeepEqualOutputSelector(
  opportunities.selectors.selectLpOpportunitiesById,
  selectLpIdParamFromFilter,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectAssets,
  selectMarketDataUserCurrency,
  (
    lpOpportunitiesById,
    lpId,
    lpAssetBalanceCryptoBaseUnit,
    assets,
    marketDataUserCurrency,
  ): LpEarnOpportunityType | undefined => {
    if (!lpId) return

    const lpAsset = assets[lpId as AssetId]
    const marketDataPrice = marketDataUserCurrency[lpId as AssetId]?.price
    const opportunityMetadata = lpOpportunitiesById[lpId]

    if (!(opportunityMetadata && lpAsset)) return

    // If we don't have underlying assets, we have bigger problems
    if (
      !opportunityMetadata.underlyingAssetIds.every(underlyingAssetId => assets[underlyingAssetId])
    )
      return

    const [underlyingToken0AmountCryptoBaseUnit, underlyingToken1AmountCryptoBaseUnit] =
      opportunityMetadata.underlyingAssetIds.map((underlyingAssetId, i) => {
        const underlyingAsset = assets[underlyingAssetId]

        if (!underlyingAsset) return '0'

        return (
          bnOrZero(lpAssetBalanceCryptoBaseUnit)
            // to LP asset base unit
            .times(
              fromBaseUnit(
                opportunityMetadata.underlyingAssetRatiosBaseUnit[i],
                underlyingAsset.precision,
              ),
            )
            // to precision
            .div(bn(10).pow(lpAsset.precision))
            // to underlying asset base unit
            .times(bn(10).pow(underlyingAsset.precision))
            .toFixed()
        )
      })

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
        bnOrZero(b[lpId as AssetId])
          .minus(bnOrZero(a[lpId as AssetId]))
          .toNumber(),
      )[0]

    // Chainable methods that produce an iterable screw the narrowed type back to string
    const foundAccountId: AccountId = foundEntries?.[0]

    return foundAccountId
  },
)

export const selectUnderlyingLpAssetsWithBalancesAndIcons = createSelector(
  selectLpIdParamFromFilter,
  opportunities.selectors.selectLpOpportunitiesById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectAssets,
  selectMarketDataUserCurrency,
  (
    lpId,
    lpOpportunitiesById,
    lpAssetBalancePrecision,
    assets,
    marketDataUserCurrency,
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
      marketDataUserCurrency,
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
  opportunities.selectors.selectLpOpportunitiesById,
  selectPortfolioAssetBalancesBaseUnit,
  selectAssets,
  selectMarketDataUserCurrency,
  (
    lpOpportunitiesById,
    portfolioAssetBalancesById,
    assets,
    marketDataUserCurrency,
  ): LpEarnOpportunityType[] => {
    const opportunities: LpEarnOpportunityType[] = []

    if (!portfolioAssetBalancesById) return opportunities

    for (const opportunityMetadata of Object.values(lpOpportunitiesById)) {
      if (!opportunityMetadata) continue
      const underlyingAssetId = opportunityMetadata.underlyingAssetId

      const lpAsset = assets[underlyingAssetId]

      if (!lpAsset) continue

      const marketDataPrice = marketDataUserCurrency[underlyingAssetId]?.price
      const aggregatedLpAssetBalance = portfolioAssetBalancesById[underlyingAssetId]

      /* Get amounts of each underlying token (in base units, eg. wei) */
      /* TODO:(pastaghost) Generalize this (and LpEarnOpportunityType) so that number of underlying assets is not assumed to be 2. */
      const [underlyingToken0AmountCryptoBaseUnit, underlyingToken1AmountCryptoBaseUnit] =
        opportunityMetadata.underlyingAssetIds.map((assetId, i) =>
          bnOrZero(aggregatedLpAssetBalance)
            .times(opportunityMetadata?.underlyingAssetRatiosBaseUnit[i])
            .div(bn(10).pow(bnOrZero(assets[assetId]?.precision)))
            .toFixed()
            .toString(),
        )

      /* Transform data into LpEarnOpportunityType */
      const opportunity: LpEarnOpportunityType = {
        ...opportunityMetadata,
        isLoaded: true,
        chainId: fromAssetId(underlyingAssetId).chainId,
        underlyingToken0AmountCryptoBaseUnit,
        underlyingToken1AmountCryptoBaseUnit,
        cryptoAmountPrecision: bnOrZero(aggregatedLpAssetBalance)
          .div(bn(10).pow(lpAsset.precision))
          .toString(),
        // TODO(gomes): use base unit as source of truth, conversions back and forth are unsafe
        cryptoAmountBaseUnit: aggregatedLpAssetBalance,
        fiatAmount: bnOrZero(aggregatedLpAssetBalance)
          .times(marketDataPrice ?? '0')
          .div(bn(10).pow(lpAsset.precision))
          .toString(),
        icons: opportunityMetadata.underlyingAssetIds
          .map(assetId => assets[assetId]?.icon)
          .map(icon => icon ?? ''),
        opportunityName: opportunityMetadata.name,
        rewardAddress: '',
      }

      opportunities.push(opportunity)
    }

    const sortedOpportunitiesByFiatAmount = opportunities.sort((a, b) =>
      bnOrZero(a.fiatAmount).gte(bnOrZero(b.fiatAmount)) ? -1 : 1,
    )

    const [activeOpportunities, inactiveOpportunities] = partition(
      sortedOpportunitiesByFiatAmount,
      opportunity => bnOrZero(opportunity.fiatAmount).gt(0),
    )
    inactiveOpportunities.sort((a, b) => (bnOrZero(a.apy).gte(bnOrZero(b.apy)) ? -1 : 1))

    return activeOpportunities.concat(inactiveOpportunities)
  },
)

export const selectAllEarnUserLpOpportunitiesByFilter = createDeepEqualOutputSelector(
  opportunities.selectors.selectLpOpportunitiesById,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAssets,
  selectMarketDataUserCurrency,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  (
    lpOpportunitiesById,
    portfolioAccountBalanceById,
    portfolioAssetBalancesById,
    assets,
    marketDataUserCurrency,
    assetId,
    accountId,
  ): LpEarnOpportunityType[] => {
    if (!assetId) return []
    const opportunities: LpEarnOpportunityType[] = Object.entries(lpOpportunitiesById).reduce(
      (opportunities: LpEarnOpportunityType[], [lpId, opportunityMetadata]) => {
        if (!opportunityMetadata) return opportunities
        const marketDataPrice = marketDataUserCurrency[lpId as AssetId]?.price
        let opportunityBalance = bnOrZero(portfolioAssetBalancesById[lpId]).toString()
        if (accountId) {
          opportunityBalance = bnOrZero(portfolioAccountBalanceById[accountId][lpId]).toString()
        }
        if (bnOrZero(opportunityBalance).eq(0)) return opportunities
        if (
          opportunityMetadata?.underlyingAssetIds.length &&
          opportunityMetadata.underlyingAssetIds.includes(assetId)
        ) {
          const [underlyingToken0AmountCryptoBaseUnit, underlyingToken1AmountCryptoBaseUnit] =
            opportunityMetadata.underlyingAssetIds.map((assetId, i) =>
              bnOrZero(opportunityBalance)
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
            cryptoAmountPrecision: bnOrZero(opportunityBalance)
              .div(bn(10).pow(assets[lpId]?.precision ?? '0'))
              .toString(),
            // TODO(gomes): use base unit as source of truth, conversions back and forth are unsafe
            cryptoAmountBaseUnit: opportunityBalance,
            fiatAmount: bnOrZero(opportunityBalance)
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
      [],
    )
    return opportunities
  },
)
