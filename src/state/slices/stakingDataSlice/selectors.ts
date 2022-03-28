import { createSelector } from '@reduxjs/toolkit'
import { CAIP10 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import {
  Delegation,
  RedelegationEntry,
  UndelegationEntry
} from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

export const selectStakingDataStatus = (state: ReduxState) => state.stakingData.status
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

export const selectUnbondingEntriesbyAccountSpecifier = createDeepEqualOutputSelector(
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

export const selectTotalBondingsBalancebyAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDatabyAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): BigNumber => {
    const initial = bnOrZero(0)
    if (!stakingData) return initial

    const { undelegations, delegations, redelegations } = stakingData

    const totalBondings: BigNumber = [
      ...delegations.filter(({ validator }) => validator.address === validatorAddress),
      ...undelegations
        .filter(({ validator }) => validator.address === validatorAddress)
        .map(({ entries }) => entries)
        .flat(),
      ...redelegations
        .filter(({ destinationValidator }) => destinationValidator.address === validatorAddress)
        .map(({ entries }) => entries)
        .flat()
    ].reduce(
      (acc: BigNumber, current: Delegation | UndelegationEntry | RedelegationEntry) =>
        bnOrZero(acc).plus(bnOrZero(current.amount)),
      initial
    )

    return totalBondings
  }
)

export const selectRewardsCryptoBalancebyAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDatabyAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    const initial = bnOrZero(0)
    if (!stakingData || !stakingData.rewards) return initial

    const balance = stakingData.rewards
      .filter(({ validator }) => validator.address === validatorAddress)
      .map(({ rewards }) => rewards)
      .flat()
      .reduce((acc: BigNumber, current) => bnOrZero(acc).plus(bnOrZero(current.amount)), initial)

    return balance
  }
)
