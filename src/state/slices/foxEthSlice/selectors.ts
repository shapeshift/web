import { createSelector } from '@reduxjs/toolkit'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'

import { foxEthLpAssetId } from './constants'

export const selectFoxEthLpOpportunity = (state: ReduxState) => state.foxEth.lpOpportunity

export const selectFoxFarmingOpportunities = (state: ReduxState) =>
  state.foxEth.farmingOpportunities

export const selectVisibleFoxFarmingOpportunities = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunities,
  opportunities =>
    opportunities.filter(
      opportunity =>
        !opportunity.expired || (opportunity.expired && bnOrZero(opportunity.cryptoAmount).gt(0)),
    ),
)

export const selectFoxFarmingOpportunityByContractAddress = createSelector(
  selectFoxFarmingOpportunities,
  (_state: ReduxState, contractAddress: string) => contractAddress,
  (opportunities, contractAddress) =>
    opportunities.find(opportunity => opportunity.contractAddress === contractAddress),
)

export const selectFarmContractsBalance = createSelector(
  selectFoxFarmingOpportunities,
  (farmingOpportunities): string => {
    const foxFarmingTotalCryptoAmount = farmingOpportunities.reduce(
      (totalBalance, opportunity) => totalBalance.plus(bnOrZero(opportunity.cryptoAmount)),
      bnOrZero(0),
    )
    return foxFarmingTotalCryptoAmount.toString()
  },
)

export const selectLpPlusFarmContractsBaseUnitBalance = createSelector(
  selectAssets,
  selectFoxEthLpOpportunity,
  selectFarmContractsBalance,
  (assetsById, lpOpportunity, farmContractsBalance) => {
    const lpAsset = assetsById[foxEthLpAssetId]
    return toBaseUnit(
      bnOrZero(lpOpportunity.cryptoAmount).plus(bnOrZero(farmContractsBalance)),
      // src/state/reselect-tools.test.ts fails saying lpAsset is undefined
      lpAsset?.precision ?? 0,
    )
  },
)

export const selectFoxEthLpFiatBalance = createSelector(
  selectMarketData,
  selectFoxEthLpOpportunity,
  (marketData, lpOpportunity) => {
    const lpTokenPrice = marketData[foxEthLpAssetId]?.price ?? 0
    return bnOrZero(lpOpportunity.cryptoAmount).times(lpTokenPrice).toFixed(2)
  },
)

export const selectFarmContractsFiatBalance = createSelector(
  selectMarketData,
  selectFarmContractsBalance,
  (marketData, foxFarmingTotalCryptoAmount) => {
    const lpTokenPrice = marketData[foxEthLpAssetId]?.price ?? 0
    return bnOrZero(foxFarmingTotalCryptoAmount).times(lpTokenPrice).toFixed(2)
  },
)
