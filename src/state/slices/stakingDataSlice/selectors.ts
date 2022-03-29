import { createSelector } from '@reduxjs/toolkit'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import {
  Delegation,
  RedelegationEntry,
  UndelegationEntry,
  ValidatorReward
} from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

export const ASSET_ID_TO_DENOM: { [k: CAIP19]: string } = {
  'cosmos:cosmoshub-4/slip44:118': 'uatom'
}

export const DENOM_TO_ASSET_ID: { [k: string]: CAIP19 } = {
  uatom: 'cosmos:cosmoshub-4/slip44:118'
}

export const selectStakingDataStatus = (state: ReduxState) => state.stakingData.status
const selectAccountSpecifier = (_state: ReduxState, accountSpecifier: CAIP10, ...args: any[]) =>
  accountSpecifier

const selectValidatorAddress = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string,
  ...args: any[]
) => validatorAddress

const selectDenom = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string,
  denom: string,
  ...args: any[]
) => denom

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

export const selectRewardsByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDatabyAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    if (!stakingData || !stakingData.rewards) return []

    const rewards = stakingData.rewards.reduce(
      (acc: Array<{ denom: string; amount: string }>, current: ValidatorReward) => {
        if (current.validator.address !== validatorAddress) return acc

        current.rewards.forEach(reward => {
          acc.push({
            denom: ASSET_ID_TO_DENOM[reward.assetId],
            amount: reward.amount
          })
        })

        return acc
      },
      []
    )

    return rewards
  }
)

export const selectRewardsAmountByDenom = createDeepEqualOutputSelector(
  selectRewardsByAccountSpecifier,
  selectValidatorAddress,
  selectDenom,
  (rewardsByAccountSpecifier, validatorAddress, denom): BigNumber => {
    if (!rewardsByAccountSpecifier.length) return bnOrZero('0')

    const rewards = rewardsByAccountSpecifier.find(rewards => rewards.denom === denom)

    return bnOrZero(rewards?.amount)
  }
)
