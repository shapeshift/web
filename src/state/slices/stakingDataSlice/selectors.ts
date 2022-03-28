import { createSelector } from '@reduxjs/toolkit'
import { CAIP10 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import {
  Delegation,
  RedelegationEntry,
  Reward,
  UndelegationEntry
} from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import { ReduxState } from 'state/reducer'

const selectAccountSpecifier = (_state: ReduxState, accountSpecifier: CAIP10, ...args: any[]) =>
  accountSpecifier
const selectValidatorAddress = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string,
  ...args: any[]
) => validatorAddress

export const selectStakingData = (state: ReduxState) => state.stakingData

export const selectStakingDatabyAccountSpecifier = createSelector(
  selectStakingData,
  selectAccountSpecifier,
  selectValidatorAddress,
  (stakingData, accountSpecifier, validatorAddress) => {
    return stakingData.byAccountSpecifier[accountSpecifier] || null
  }
)

export const selectUnbondingEntriesbyAccountSpecifier = createSelector(
  selectStakingDatabyAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    if (!stakingData || !stakingData.undelegations) return []

    return stakingData.undelegations
      .filter(({ validator }) => validator.address === validatorAddress)
      .map(({ entries }) => entries)
      .flat()
  }
)

export const selectTotalBondingsBalancebyAccountSpecifier = createSelector(
  selectStakingDatabyAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): BigNumber => {
    const initial = bnOrZero(0)
    if (!stakingData) return initial

    const { undelegations, delegations, redelegations } = stakingData

    const totalBondings = [
      ...delegations.filter(({ validator }) => validator.address === validatorAddress),
      ...undelegations
        .filter(({ validator }) => validator.address === validatorAddress)
        .map(({ entries }) => entries)
        .flat(),
      ...redelegations
        .filter(({ destinationValidator }) => destinationValidator.address === validatorAddress)
        .map(({ entries }) => entries)
        .flat()
    ].reduce<BigNumber>(
      (acc: BigNumber, current: Delegation | UndelegationEntry | RedelegationEntry) =>
        bnOrZero(acc).plus(bnOrZero(current.amount)),
      initial
    )

    return totalBondings
  }
)

export const selectRewardsCryptoBalancebyAccountSpecifier = createSelector(
  selectStakingDatabyAccountSpecifier,
  (stakingData): BigNumber => {
    const initial = bnOrZero(0)
    if (!stakingData || !stakingData.rewards) return initial

    return stakingData.rewards.reduce<BigNumber>(
      (acc: BigNumber, current: Reward) => bnOrZero(acc).plus(bnOrZero(current.amount)),
      initial
    )
  }
)
