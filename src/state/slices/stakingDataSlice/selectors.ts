import { createSelector } from '@reduxjs/toolkit'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { chainAdapters } from '@shapeshiftoss/types'
import { ValidatorReward } from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import get from 'lodash/get'
import memoize from 'lodash/memoize'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

export type ActiveStakingOpportunity = {
  address: string
  moniker: string
  apr: string
  cryptoAmount?: string
  rewards?: string
}

export type amountByValidatorAddressType = {
  [k: string]: string
}

export const selectStakingDataStatus = (state: ReduxState) => state.stakingData.status
export const selectValidatorStatus = (state: ReduxState) => state.stakingData.validatorStatus
const selectAccountSpecifier = (_state: ReduxState, accountSpecifier: CAIP10) => accountSpecifier

const selectValidatorAddress = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string
) => validatorAddress

const selectAssetId = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: string,
  assetId: CAIP19
) => assetId

export const selectStakingData = (state: ReduxState) => state.stakingData

export const selectStakingDataByAccountSpecifier = createSelector(
  selectStakingData,
  selectAccountSpecifier,
  (stakingData, accountSpecifier) => {
    return stakingData.byAccountSpecifier[accountSpecifier] || null
  }
)

export const selectDelegationCryptoAmountByAssetId = createSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  selectAssetId,
  (stakingData, validatorAddress, selectedAssetId): string | undefined => {
    if (!stakingData || !stakingData.delegations?.length) return

    const delegation = stakingData.delegations.find(
      ({ assetId, validator }) =>
        assetId === selectedAssetId && validator.address === validatorAddress
    )
    return delegation?.amount
  }
)

export const selectAllDelegationsCryptoAmountByAssetId = createSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetId,
  (stakingData, selectedAssetId): amountByValidatorAddressType => {
    if (!stakingData || !stakingData.delegations?.length) return {}

    const delegations = stakingData.delegations.reduce(
      (acc: amountByValidatorAddressType, { assetId, amount, validator: { address } }) => {
        if (assetId !== selectedAssetId) return acc

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
  (stakingData, validatorAddress): chainAdapters.cosmos.RedelegationEntry[] => {
    if (!stakingData || !stakingData.redelegations?.length) return []

    const redelegation = stakingData.redelegations.find(
      ({ destinationValidator }) => destinationValidator.address === validatorAddress
    )

    return redelegation?.entries || []
  }
)

export const selectRedelegationCryptoAmountByAssetId = createSelector(
  selectRedelegationEntriesByAccountSpecifier,
  selectAssetId,
  (redelegationEntries, selectedAssetId): string | undefined => {
    if (!redelegationEntries.length) return

    return redelegationEntries
      .reduce((acc, current) => {
        if (current.assetId !== selectedAssetId) return acc

        return acc.plus(bnOrZero(current.amount))
      }, bnOrZero(0))
      .toString()
  }
)

export const selectUnbondingEntriesByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): chainAdapters.cosmos.UndelegationEntry[] => {
    if (!stakingData || !stakingData.undelegations) return []

    return (
      stakingData.undelegations.find(({ validator }) => validator.address === validatorAddress)
        ?.entries || []
    )
  }
)

export const selectAllUnbondingsEntriesByAssetId = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetId,
  (stakingData, selectedAssetId): Record<string, chainAdapters.cosmos.UndelegationEntry[]> => {
    if (!stakingData || !stakingData.undelegations) return {}

    return stakingData.undelegations.reduce((acc, { validator, entries }) => {
      if (!acc[validator.address]) {
        acc[validator.address] = []
      }

      acc[validator.address].push(...entries.filter(x => x.assetId === selectedAssetId))

      return acc
    }, {} as Record<string, chainAdapters.cosmos.UndelegationEntry[]>)
  }
)

export const selectUnbondingCryptoAmountByAssetId = createSelector(
  selectUnbondingEntriesByAccountSpecifier,
  selectAssetId,
  (unbondingEntries, selectedAssetId): string | undefined => {
    if (!unbondingEntries.length) return

    return unbondingEntries
      .reduce((acc, current) => {
        if (current.assetId !== selectedAssetId) return acc

        return acc.plus(bnOrZero(current.amount))
      }, bnOrZero(0))
      .toString()
  }
)

export const selectTotalBondingsBalanceByAccountSpecifier = createSelector(
  selectUnbondingCryptoAmountByAssetId,
  selectDelegationCryptoAmountByAssetId,
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
  (stakingData, validatorAddress): chainAdapters.cosmos.Reward[] => {
    if (!stakingData || !stakingData.rewards) return []

    const rewards = stakingData.rewards.reduce(
      (acc: chainAdapters.cosmos.Reward[], current: ValidatorReward) => {
        if (current.validator.address !== validatorAddress) return acc

        acc.push(...current.rewards)

        return acc
      },
      []
    )

    return rewards
  }
)

export const selectAllRewardsByAssetId = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetId,
  (stakingData, selectedAssetId): Record<string, chainAdapters.cosmos.Reward[]> => {
    if (!stakingData || !stakingData.rewards) return {}

    const rewards = stakingData.rewards.reduce(
      (acc: Record<string, chainAdapters.cosmos.Reward[]>, current: ValidatorReward) => {
        if (!acc[current.validator.address]) {
          acc[current.validator.address] = []
        }

        acc[current.validator.address].push(
          ...current.rewards.filter(x => x.assetId === selectedAssetId)
        )

        return acc
      },
      {}
    )

    return rewards
  }
)

export const selectRewardsAmountByAssetId = createSelector(
  selectRewardsByAccountSpecifier,
  selectAssetId,
  (rewardsByAccountSpecifier, selectedAssetId): string => {
    if (!rewardsByAccountSpecifier.length) return ''

    const rewards = rewardsByAccountSpecifier.find(rewards => rewards.assetId === selectedAssetId)

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

export const selectUndelegationsAmountByValidatorAddress = memoize(
  (
    allUndelegationsEntries: Record<string, chainAdapters.cosmos.UndelegationEntry[]>,
    validatorAddress: string
  ) => {
    return get(
      allUndelegationsEntries,
      validatorAddress,
      [] as chainAdapters.cosmos.UndelegationEntry[]
    )
      .reduce((acc: BigNumber, undelegationEntry: chainAdapters.cosmos.UndelegationEntry) => {
        acc = acc.plus(bnOrZero(undelegationEntry.amount))
        return acc
      }, bnOrZero(0))
      .toString()
  },
  (
    allUndelegationsEntries: Record<string, chainAdapters.cosmos.UndelegationEntry[]>,
    validatorAddress: string
  ) =>
    get(allUndelegationsEntries, validatorAddress, [] as chainAdapters.cosmos.UndelegationEntry[])
)

export const selectRewardsAmountByValidatorAddress = memoize(
  (allRewards: Record<string, chainAdapters.cosmos.Reward[]>, validatorAddress: string) => {
    return get(allRewards, validatorAddress, [] as chainAdapters.cosmos.Reward[])
      .reduce((acc: BigNumber, rewardEntry: chainAdapters.cosmos.Reward) => {
        acc = acc.plus(bnOrZero(rewardEntry.amount))
        return acc
      }, bnOrZero(0))
      .toString()
  },
  (allRewards: Record<string, chainAdapters.cosmos.Reward[]>, validatorAddress: string) =>
    get(allRewards, validatorAddress, [] as chainAdapters.cosmos.Reward[])
)

export const selectTotalCryptoAmount = memoize(
  (delegationsAmount: string, undelegationsAmount: string) => {
    return bnOrZero(delegationsAmount).plus(bnOrZero(undelegationsAmount)).toString()
  }
)

export const selectActiveStakingOpportunityDataByAssetId = createDeepEqualOutputSelector(
  selectAllDelegationsCryptoAmountByAssetId,
  selectAllUnbondingsEntriesByAssetId,
  selectAllRewardsByAssetId,
  selectAllValidators,
  (
    allDelegationsAmount,
    allUndelegationsEntries,
    allRewards,
    allValidators
  ): ActiveStakingOpportunity[] => {
    return Object.entries(allValidators).reduce(
      (acc: ActiveStakingOpportunity[], [validatorAddress, { apr, moniker }]) => {
        const delegationsAmount = allDelegationsAmount[validatorAddress] ?? '0'

        const undelegationsAmount = selectUndelegationsAmountByValidatorAddress(
          allUndelegationsEntries,
          validatorAddress
        )

        const rewards = selectRewardsAmountByValidatorAddress(allRewards, validatorAddress)

        const cryptoAmount = selectTotalCryptoAmount(delegationsAmount, undelegationsAmount)

        if (cryptoAmount !== '0' || rewards !== '0') {
          acc.push({
            address: validatorAddress,
            apr,
            moniker,
            cryptoAmount,
            rewards
          })
        }

        return acc
      },
      []
    )
  }
)
