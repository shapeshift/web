import { createSelector } from '@reduxjs/toolkit'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { ReduxState } from 'state/reducer'

export const selectFoxEthLpOpportunity = (state: ReduxState) => state.foxEth.lpOpportunity

export const selectFoxFarmingOpportunities = (state: ReduxState) => state.foxEth.farmOpportunities

export const selectVisibleFoxFarmingOpportunities = createSelector(
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
