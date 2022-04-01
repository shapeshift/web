import { createSelector } from '@reduxjs/toolkit'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { chainAdapters } from '@shapeshiftoss/types'
import { ValidatorReward } from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import get from 'lodash/get'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

export const ASSET_ID_TO_DENOM: { [k: CAIP19]: string } = {
  'cosmos:cosmoshub-4/slip44:118': 'uatom'
}

export const DENOM_TO_ASSET_ID: { [k: string]: CAIP19 } = {
  uatom: 'cosmos:cosmoshub-4/slip44:118'
}

export type ActiveStakingOpportunity = {
  address: string
  moniker: string
  apr: string
  cryptoAmount?: string
  rewards?: string
}

export type amountbyValidatorAddressType = {
  [k: string]: string
}

export type redelegationsEntriesbyValidatorAddressType = {
  [k: CAIP10]: chainAdapters.cosmos.RedelegationEntry[]
}

export const selectStakingDataStatus = (state: ReduxState) => state.stakingData.status
export const selectValidatorStatus = (state: ReduxState) => state.stakingData.validatorStatus
const selectAccountSpecifier = (_state: ReduxState, accountSpecifier: CAIP10) => accountSpecifier

const selectValidatorAddress = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string
) => validatorAddress

const selectDenom = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string,
  denom: string
) => denom

export const selectStakingData = (state: ReduxState) => state.stakingData

export const selectStakingDataByAccountSpecifier = createSelector(
  selectStakingData,
  selectAccountSpecifier,
  (stakingData, accountSpecifier) => {
    return stakingData.byAccountSpecifier[accountSpecifier] || null
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

export const selectAllDelegationsCryptoAmountByDenom = createSelector(
  selectStakingDataByAccountSpecifier,
  selectDenom,
  (stakingData, denom): amountbyValidatorAddressType => {
    if (!stakingData || !stakingData.delegations?.length) return {}

    const delegations = stakingData.delegations.reduce(
      (acc: amountbyValidatorAddressType, { assetId, amount, validator: { address } }) => {
        if (ASSET_ID_TO_DENOM[assetId] !== denom) return acc

        acc[address] = amount
        return acc
      },
      {}
    )
    return delegations
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

export const selectAllUnbondingsEntriesByDenom = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectDenom,
  (stakingData, denom): Record<string, chainAdapters.cosmos.UndelegationEntry[]> => {
    if (!stakingData || !stakingData.undelegations) return {}

    return stakingData.undelegations.reduce((acc, { validator, entries }) => {
      if (!acc[validator.address]) {
        acc[validator.address] = []
      }

      acc[validator.address].push(...entries.filter(x => ASSET_ID_TO_DENOM[x.assetId] === denom))

      return acc
    }, {} as Record<string, chainAdapters.cosmos.UndelegationEntry[]>)
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
  (unbondingCryptoBalance, delegationCryptoBalance): string => {
    const totalBondings = bnOrZero(unbondingCryptoBalance)
      .plus(bnOrZero(delegationCryptoBalance))
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

export const selectAllRewardsByDenom = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectDenom,
  (stakingData, denom): Record<string, chainAdapters.cosmos.Reward[]> => {
    if (!stakingData || !stakingData.rewards) return {}

    const rewards = stakingData.rewards.reduce(
      (acc: Record<string, chainAdapters.cosmos.Reward[]>, current: ValidatorReward) => {
        if (!acc[current.validator.address]) {
          acc[current.validator.address] = []
        }

        acc[current.validator.address].push(
          ...current.rewards.filter(x => ASSET_ID_TO_DENOM[x.assetId] === denom)
        )

        return acc
      },
      {}
    )

    return rewards
  }
)

export const selectRewardsAmountByDenom = createSelector(
  selectRewardsByAccountSpecifier,
  selectValidatorAddress,
  selectDenom,
  (rewardsByAccountSpecifier, validatorAddress, denom): string => {
    if (!rewardsByAccountSpecifier.length) return ''

    const rewards = rewardsByAccountSpecifier.find(rewards => rewards.denom === denom)

    return rewards?.amount || ''
  }
)

export const selectAllValidators = createDeepEqualOutputSelector(
  selectStakingData,
  stakingData => stakingData.byValidator
)

export const selectSingleValidator = createSelector(
  selectStakingData,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    return stakingData.byValidator[validatorAddress] || null
  }
)

export const selectNonloadedValidators = createSelector(
  selectStakingDataByAccountSpecifier,
  selectAllValidators,
  (stakingData, allValidators): string[] => {
    if (!stakingData) return []
    const initialValidatorsAddresses = stakingData.delegations
      ? stakingData.delegations.map(x => x.validator.address)
      : []
    if (stakingData.undelegations) {
      initialValidatorsAddresses.push(...stakingData.undelegations.map(x => x.validator.address))
    }

    if (stakingData.rewards) {
      initialValidatorsAddresses.push(...stakingData.rewards.map(x => x.validator.address))
    }

    const uniqueValidatorAddresses = [...new Set(initialValidatorsAddresses)]
    return uniqueValidatorAddresses.filter(x => allValidators[x] === undefined)
  }
)

export const selectActiveStakingOpportunityDataByDenom = createDeepEqualOutputSelector(
  selectAllDelegationsCryptoAmountByDenom,
  selectAllUnbondingsEntriesByDenom,
  selectAllRewardsByDenom,
  selectAllValidators,
  (
    allDelegationsAmount,
    allUndelegationsEntries,
    allRewards,
    allValidators
  ): ActiveStakingOpportunity[] => {
    const result = Object.entries(allValidators).map(([validatorAddress, { apr, moniker }]) => {
      const delegationsAmount = allDelegationsAmount[validatorAddress] ?? '0'
      const undelegationsAmount = get(
        allUndelegationsEntries,
        validatorAddress,
        [] as chainAdapters.cosmos.UndelegationEntry[]
      )
        .reduce((acc: BigNumber, undelegationEntry: chainAdapters.cosmos.UndelegationEntry) => {
          acc = acc.plus(bnOrZero(undelegationEntry.amount))
          return acc
        }, bnOrZero(0))
        .toString()

      const rewards = get(allRewards, validatorAddress, [] as chainAdapters.cosmos.Reward[])
        .reduce((acc: BigNumber, rewardEntry: chainAdapters.cosmos.Reward) => {
          acc = acc.plus(bnOrZero(rewardEntry.amount))
          return acc
        }, bnOrZero(0))
        .toString()

      const cryptoAmount = bnOrZero(delegationsAmount)
        .plus(bnOrZero(undelegationsAmount))
        .toString()

      return {
        address: validatorAddress,
        apr,
        moniker,
        cryptoAmount,
        rewards
      }
    })

    return result.filter(x => x.cryptoAmount !== '0' || x.rewards !== '0')
  }
)
