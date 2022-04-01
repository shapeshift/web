import { createSelector } from '@reduxjs/toolkit'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { ValidatorReward } from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
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

export const selectStakingDataByAccountSpecifier = createSelector(
  selectStakingData,
  selectAccountSpecifier,
  (stakingData, accountSpecifier) => {
    return stakingData.byAccountSpecifier[accountSpecifier] || null
  }
)

export const selectTotalStakingDelegationCryptoByAccountSpecifier = createSelector(
  selectStakingDataByAccountSpecifier,
  stakingData => {
    // We make the assumption that all delegation rewards come from a single denom (asset)
    // In the future there may be chains that support rewards in multiple denoms and this will need to be parsed differently
    return stakingData?.delegations?.reduce(
      (acc, delegation) => bnOrZero(acc).plus(delegation.amount).toString(),
      '0'
    )
  }
)

export const selectDelegationCryptoAmountByDenom = createSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  selectDenom,
  (stakingData, validatorAddress, denom): string | undefined => {
    if (!stakingData || !stakingData.delegations?.length) return

    const delegation = stakingData.delegations.find(
      ({ assetId, validator }) =>
        ASSET_ID_TO_DENOM[assetId] === denom && validator.address === validatorAddress
    )
    return delegation?.amount
  }
)

export const selectRedelegationEntriesByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): Array<{ denom: string; amount: string }> => {
    if (!stakingData || !stakingData.redelegations?.length) return []

    const redelegation = stakingData.redelegations.find(
      ({ destinationValidator }) => destinationValidator.address === validatorAddress
    )

    return (
      redelegation?.entries.map(redelegationEntry => ({
        denom: ASSET_ID_TO_DENOM[redelegationEntry.assetId],
        amount: redelegationEntry.amount
      })) || []
    )
  }
)

export const selectRedelegationCryptoAmountByDenom = createSelector(
  selectRedelegationEntriesByAccountSpecifier,
  selectDenom,
  (redelegationEntries, denom): string | undefined => {
    if (!redelegationEntries.length) return

    return redelegationEntries
      .reduce((acc, current) => {
        if (current.denom !== denom) return acc

        return acc.plus(bnOrZero(current.amount))
      }, bnOrZero(0))
      .toString()
  }
)

export const selectUnbondingEntriesByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  (
    stakingData,
    validatorAddress
  ): Array<{ denom: string; amount: string; completionTime: number }> => {
    if (!stakingData || !stakingData.undelegations) return []

    return (
      stakingData.undelegations
        .find(({ validator }) => validator.address === validatorAddress)
        ?.entries.map(undelegationEntry => ({
          denom: ASSET_ID_TO_DENOM[undelegationEntry.assetId],
          amount: undelegationEntry.amount,
          completionTime: undelegationEntry.completionTime
        })) || []
    )
  }
)

export const selectUnbondingCryptoAmountByDenom = createSelector(
  selectUnbondingEntriesByAccountSpecifier,
  selectDenom,
  (unbondingEntries, denom): string | undefined => {
    if (!unbondingEntries.length) return

    return unbondingEntries
      .reduce((acc, current) => {
        if (current.denom !== denom) return acc

        return acc.plus(bnOrZero(current.amount))
      }, bnOrZero(0))
      .toString()
  }
)

export const selectTotalBondingsBalanceByAccountSpecifier = createSelector(
  selectUnbondingCryptoAmountByDenom,
  selectDelegationCryptoAmountByDenom,
  selectRedelegationCryptoAmountByDenom,
  (unbondingCryptoBalance, delegationCryptoBalance, redelegationCryptoBalance): string => {
    const totalBondings = bnOrZero(unbondingCryptoBalance)
      .plus(bnOrZero(delegationCryptoBalance))
      .plus(bnOrZero(redelegationCryptoBalance))
      .toString()

    return totalBondings
  }
)

export const selectRewardsByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): Array<{ denom: string; amount: string }> => {
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

export const selectRewardsAmountByDenom = createSelector(
  selectRewardsByAccountSpecifier,
  selectDenom,
  (rewardsByAccountSpecifier, denom): string => {
    if (!rewardsByAccountSpecifier.length) return ''

    const rewards = rewardsByAccountSpecifier.find(rewards => rewards.denom === denom)

    return rewards?.amount || ''
  }
)
