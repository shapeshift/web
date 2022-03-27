import { createSelector } from '@reduxjs/toolkit'
import { CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import {
  Delegation,
  RedelegationEntry,
  Reward,
  UndelegationEntry
} from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import { ReduxState } from 'state/reducer'

import { StakingData } from './stakingDataSlice'

const selectPubKey = (_state: ReduxState, pubKey: CAIP19, ...args: any[]) => pubKey
const selectValidatorAddress = (_state: ReduxState, validatorAddress: string, ...args: any[]) =>
  validatorAddress

export const selectStakingData = (state: ReduxState) => state.stakingData

export const selectStakingDataByPubKey = createSelector(
  selectStakingData,
  selectPubKey,
  (stakingData, pubKey) => stakingData.byPubKey[pubKey] || null
)

export const selectUnbondingEntriesByPubKey = createSelector(
  selectStakingDataByPubKey,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    if (!stakingData || !stakingData.undelegations) return []

    return stakingData.undelegations
      .filter(({ validator }) => validator.address === validatorAddress)
      .map(({ entries }) => entries)
      .flat()
  }
)

export const selectTotalBondingsBalanceByPubKey = createSelector(
  selectStakingDataByPubKey,
  selectValidatorAddress,
  (stakingData, validatorAddress): BigNumber => {
    const initial = bnOrZero(0)
    if (!stakingData) return initial

    const { undelegations, delegations, redelegations } = stakingData

    return [
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
        bnOrZero(acc).plus(current?.amount || 0),
      initial
    )
  }
)

export const selectRewardsCryptoBalanceByPubKey = createSelector(
  selectStakingDataByPubKey,
  (stakingData): BigNumber => {
    const initial = bnOrZero(0)
    if (!stakingData || !stakingData.rewards) return initial

    return stakingData.rewards.reduce<BigNumber>(
      (acc: BigNumber, current: Reward) => bnOrZero(acc).plus(current?.amount || 0),
      initial
    )
  }
)
