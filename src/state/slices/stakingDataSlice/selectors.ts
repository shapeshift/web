import { createSelector } from '@reduxjs/toolkit'
import { CAIP10 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { chainAdapters } from '@shapeshiftoss/types'
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
  (stakingData, accountSpecifier) => {
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

export type TotalBondings = {
  validator: chainAdapters.cosmos.Validator
  finalBalance: BigNumber
}

export const selectTotalBondingsBalancebyAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDatabyAccountSpecifier,
  (stakingData): TotalBondings[] => {
    const initial = bnOrZero(0)
    if (!stakingData) return []

    const { undelegations, delegations, redelegations } = stakingData

    const totalBondingsByValidator = undelegations.map(({ validator, entries }) => {
      const balanceUndelegations = entries.reduce(
        (acc: BigNumber, current) => bnOrZero(acc).plus(bnOrZero(current.amount)),
        initial
      )

      const balanceDelegations = delegations.reduce((acc: BigNumber, current) => {
        if (validator.address === current.validator.address) {
          return bnOrZero(acc).plus(bnOrZero(current.amount))
        }
        return bnOrZero(acc)
      }, initial)

      const balanceRedelegations = redelegations
        .filter(({ destinationValidator }) => destinationValidator.address === validator.address)
        .map(({ entries }) => entries)
        .flat()
        .reduce((acc: BigNumber, current) => bnOrZero(acc).plus(bnOrZero(current.amount)), initial)

      const finalBalance = balanceUndelegations.plus(balanceDelegations).plus(balanceRedelegations)
      return {
        validator,
        finalBalance
      }
    })

    return totalBondingsByValidator
  }
)

export const selectTotalBondingsBalancebyAccountSpecifierByValidator =
  createDeepEqualOutputSelector(
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

export const selectRewardsCryptoBalancebyAccountSpecifierByValidator =
  createDeepEqualOutputSelector(
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

export const selectRewardsCryptoBalancesbyAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDatabyAccountSpecifier,
  stakingData => {
    const initial = bnOrZero(0)
    if (!stakingData || !stakingData.rewards) return initial

    const array = stakingData.rewards.map(({ validator, rewards }) => {
      const balance = rewards.reduce(
        (acc: BigNumber, current) => bnOrZero(acc).plus(bnOrZero(current.amount)),
        initial
      )
      return {
        validator,
        balance
      }
    })

    return array
  }
)

export const selectAllValidators = createDeepEqualOutputSelector(selectStakingData, stakingData =>
  Object.values(stakingData.byvalidator)
)
