import { createSelector } from '@reduxjs/toolkit'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import { chainAdapters } from '@shapeshiftoss/types'
import { ValidatorReward } from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import BigNumber from 'bignumber.js'
import get from 'lodash/get'
import memoize from 'lodash/memoize'
import reduce from 'lodash/reduce'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'

import { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { PubKey, Staking } from './stakingDataSlice'
export type ActiveStakingOpportunity = {
  address: PubKey
  moniker: string
  apr: string
  tokens: string
  cryptoAmount?: string
  rewards?: string
}

export type AmountByValidatorAddressType = {
  // This maps from validator pubkey -> staked asset in base precision
  // e.g for 1 ATOM staked on ShapeShift DAO validator:
  // {"cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf": "1000000"}
  [k: PubKey]: string
}

// accountId is optional, but we should always pass an assetId when using these params
type OptionalParamFilter = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

const selectAssetIdParamFromFilterOptional = (
  _state: ReduxState,
  paramFilter: OptionalParamFilter,
) => paramFilter?.assetId
const selectAccountIdParamFromFilterOptional = (
  _state: ReduxState,
  paramFilter: OptionalParamFilter,
) => paramFilter?.accountId

export const selectStakingDataIsLoaded = (state: ReduxState) =>
  state.stakingData.status === 'loaded'
export const selectValidatorIsLoaded = (state: ReduxState) =>
  state.stakingData.validatorStatus === 'loaded'
const selectAccountSpecifierParam = (_state: ReduxState, accountSpecifier: CAIP10) =>
  accountSpecifier

const selectValidatorAddress = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: PubKey,
) => validatorAddress

const selectAssetIdParam = (
  _state: ReduxState,
  accountSpecifier: CAIP10,
  validatorAddress: PubKey,
  assetId: CAIP19,
) => assetId

export const selectStakingData = (state: ReduxState) => state.stakingData

export const selectStakingDataByAccountSpecifier = createSelector(
  selectStakingData,
  selectAccountSpecifierParam,
  (stakingData, accountSpecifier) => {
    return stakingData.byAccountSpecifier[accountSpecifier] || null
  },
)

export const selectStakingDataByFilter = createDeepEqualOutputSelector(
  selectStakingData,
  selectAssetIdParamFromFilterOptional,
  selectAccountIdParamFromFilterOptional,
  (stakingData, _, accountId): Staking[] => {
    if (!accountId) return Object.values(stakingData.byAccountSpecifier)
    return [stakingData.byAccountSpecifier[accountId]] || null
  },
)

export const selectTotalStakingDelegationCryptoByAccountSpecifier = createSelector(
  selectStakingDataByAccountSpecifier,
  // We make the assumption that all delegation rewards come from a single denom (asset)
  // In the future there may be chains that support rewards in multiple denoms and this will need to be parsed differently
  stakingData => {
    const amount = reduce(
      stakingData?.delegations,
      (acc, delegation) => acc.plus(bnOrZero(delegation.amount)),
      bn(0),
    )

    return amount.toString()
  },
)

export const selectTotalStakingDelegationCryptoByFilter = createSelector(
  selectStakingDataByFilter,
  selectAssetIdParamFromFilterOptional,
  selectAccountIdParamFromFilterOptional,
  (state: ReduxState) => state.assets.byId,
  // We make the assumption that all delegation rewards come from a single denom (asset)
  // In the future there may be chains that support rewards in multiple denoms and this will need to be parsed differently
  (stakingData, assetId, _, assets) => {
    const amount = reduce(
      stakingData,
      (acc, singleStakingData) => {
        const amountDelegations = reduce(
          singleStakingData?.delegations,
          (acc, delegation) => acc.plus(bnOrZero(delegation.amount)),
          bn(0),
        )

        const amountUndelegations = reduce(
          singleStakingData?.undelegations,
          (acc, undelegation) => {
            undelegation.entries.forEach(undelegationEntry => {
              acc = acc.plus(bnOrZero(undelegationEntry.amount))
            })
            return acc
          },
          bn(0),
        )

        return acc.plus(amountDelegations).plus(amountUndelegations)
      },
      bn(0),
    )

    return fromBaseUnit(amount, assets[assetId]?.precision ?? 0).toString()
  },
)

export const selectAllStakingDelegationCrypto = createSelector(selectStakingData, stakingData => {
  const allStakingData = Object.entries(stakingData.byAccountSpecifier)
  return reduce(
    allStakingData,
    (acc, val) => {
      const accountId = val[0]
      const delegations = val[1].delegations
      const delegationSum = reduce(
        delegations,
        (acc, delegation) => acc.plus(bnOrZero(delegation.amount)),
        bn(0),
      )
      return { ...acc, [accountId]: delegationSum }
    },
    {},
  )
})

export const selectTotalStakingDelegationFiat = createSelector(
  selectAllStakingDelegationCrypto,
  selectMarketData,
  (state: ReduxState) => state.assets.byId,
  (allStaked: { [k: string]: string }, md, assets) => {
    const allStakingData = Object.entries(allStaked)

    return reduce(
      allStakingData,
      (acc, val) => {
        const assetId = accountIdToFeeAssetId(val[0])
        const baseUnitAmount = val[1]
        const price = md[assetId]?.price
        const amount = fromBaseUnit(baseUnitAmount, assets[assetId].precision ?? 0)
        return bnOrZero(amount).times(price).plus(acc)
      },
      bn(0),
    )
  },
)

export const selectAllDelegationsCryptoAmountByAssetId = createSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetIdParam,
  (stakingData, selectedAssetId): AmountByValidatorAddressType => {
    if (!stakingData || !stakingData.delegations?.length) return {}

    const delegations = stakingData.delegations.reduce(
      (acc: AmountByValidatorAddressType, { assetId, amount, validator: { address } }) => {
        if (assetId !== selectedAssetId) return acc

        acc[address] = amount
        return acc
      },
      {},
    )
    return delegations
  },
)

export const selectDelegationCryptoAmountByAssetIdAndValidator = createSelector(
  selectAllDelegationsCryptoAmountByAssetId,
  selectValidatorAddress,
  (allDelegations, validatorAddress): string => {
    return allDelegations[validatorAddress] ?? '0'
  },
)

export const selectRedelegationEntriesByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): chainAdapters.cosmos.RedelegationEntry[] => {
    if (!stakingData || !stakingData.redelegations?.length) return []

    const redelegation = stakingData.redelegations.find(
      ({ destinationValidator }) => destinationValidator.address === validatorAddress,
    )

    return redelegation?.entries || []
  },
)

export const selectRedelegationCryptoAmountByAssetId = createSelector(
  selectRedelegationEntriesByAccountSpecifier,
  selectAssetIdParam,
  (redelegationEntries, selectedAssetId): string => {
    if (!redelegationEntries.length) return '0'

    return redelegationEntries
      .reduce((acc, current) => {
        if (current.assetId !== selectedAssetId) return acc

        return acc.plus(bnOrZero(current.amount))
      }, bnOrZero(0))
      .toString()
  },
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
  },
)

export const selectAllUnbondingsEntriesByAssetId = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetIdParam,
  (stakingData, selectedAssetId): Record<PubKey, chainAdapters.cosmos.UndelegationEntry[]> => {
    if (!stakingData || !stakingData.undelegations) return {}

    return stakingData.undelegations.reduce<
      Record<PubKey, chainAdapters.cosmos.UndelegationEntry[]>
    >((acc, { validator, entries }) => {
      if (!acc[validator.address]) {
        acc[validator.address] = []
      }

      acc[validator.address].push(...entries.filter(x => x.assetId === selectedAssetId))

      return acc
    }, {})
  },
)

export const selectAllUnbondingsEntriesByAssetIdAndValidator = createSelector(
  selectAllUnbondingsEntriesByAssetId,
  selectValidatorAddress,
  (unbondingEntries, validatorAddress) => unbondingEntries[validatorAddress],
)

export const selectUnbondingCryptoAmountByAssetIdAndValidator = createSelector(
  selectUnbondingEntriesByAccountSpecifier,
  selectAssetIdParam,
  (unbondingEntries, selectedAssetId): string => {
    if (!unbondingEntries.length) return '0'

    return unbondingEntries
      .reduce((acc, current) => {
        if (current.assetId !== selectedAssetId) return acc

        return acc.plus(bnOrZero(current.amount))
      }, bnOrZero(0))
      .toString()
  },
)

export const selectTotalBondingsBalanceByAssetId = createSelector(
  selectUnbondingCryptoAmountByAssetIdAndValidator,
  selectDelegationCryptoAmountByAssetIdAndValidator,
  (unbondingCryptoBalance, delegationCryptoBalance): string =>
    bnOrZero(unbondingCryptoBalance).plus(bnOrZero(delegationCryptoBalance)).toString(),
)

export const selectRewardsByAccountSpecifier = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectValidatorAddress,
  (stakingData, validatorAddress): chainAdapters.cosmos.Reward[] => {
    if (!stakingData || !stakingData.rewards) return []

    return stakingData.rewards.reduce(
      (acc: chainAdapters.cosmos.Reward[], current: ValidatorReward) => {
        if (current.validator.address !== validatorAddress) return acc

        acc.push(...current.rewards)

        return acc
      },
      [],
    )
  },
)

export const selectAllRewardsByAssetId = createDeepEqualOutputSelector(
  selectStakingDataByAccountSpecifier,
  selectAssetIdParam,
  (stakingData, selectedAssetId): Record<PubKey, chainAdapters.cosmos.Reward[]> => {
    if (!stakingData || !stakingData.rewards) return {}

    const rewards = stakingData.rewards.reduce(
      (acc: Record<PubKey, chainAdapters.cosmos.Reward[]>, current: ValidatorReward) => {
        if (!acc[current.validator.address]) {
          acc[current.validator.address] = []
        }

        acc[current.validator.address].push(
          ...current.rewards.filter(x => x.assetId === selectedAssetId),
        )

        return acc
      },
      {},
    )

    return rewards
  },
)

export const selectRewardsAmountByAssetId = createSelector(
  selectRewardsByAccountSpecifier,
  selectAssetIdParam,
  (rewardsByAccountSpecifier, selectedAssetId): string => {
    if (!rewardsByAccountSpecifier.length) return ''

    const rewards = rewardsByAccountSpecifier.find(rewards => rewards.assetId === selectedAssetId)

    return rewards?.amount || ''
  },
)

export const selectAllValidators = createDeepEqualOutputSelector(
  selectStakingData,
  stakingData => stakingData.byValidator,
)

export const selectSingleValidator = createSelector(
  selectStakingData,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    return stakingData.byValidator[validatorAddress] || null
  },
)

export const selectNonloadedValidators = createSelector(
  selectStakingDataByAccountSpecifier,
  selectAllValidators,
  (stakingData, allValidators): PubKey[] => {
    if (!stakingData) return []
    const initialValidatorsAddresses = stakingData.delegations?.map(x => x.validator.address) ?? []
    initialValidatorsAddresses.push(
      ...(stakingData.undelegations?.map(x => x.validator.address) ?? []),
    )
    initialValidatorsAddresses.push(...(stakingData.rewards?.map(x => x.validator.address) ?? []))

    const uniqueValidatorAddresses = [...new Set(initialValidatorsAddresses)]
    return uniqueValidatorAddresses.filter(x => !allValidators[x])
  },
)

export const getUndelegationsAmountByValidatorAddress = memoize(
  (
    allUndelegationsEntries: Record<PubKey, chainAdapters.cosmos.UndelegationEntry[]>,
    validatorAddress: PubKey,
  ) => {
    return get<
      Record<PubKey, chainAdapters.cosmos.UndelegationEntry[]>,
      PubKey,
      chainAdapters.cosmos.UndelegationEntry[]
    >(allUndelegationsEntries, validatorAddress, [])
      .reduce(
        (acc: BigNumber, undelegationEntry: chainAdapters.cosmos.UndelegationEntry) =>
          acc.plus(bnOrZero(undelegationEntry.amount)),
        bnOrZero(0),
      )
      .toString()
  },
  (
    allUndelegationsEntries: Record<PubKey, chainAdapters.cosmos.UndelegationEntry[]>,
    validatorAddress: PubKey,
  ) =>
    get<
      Record<PubKey, chainAdapters.cosmos.UndelegationEntry[]>,
      PubKey,
      chainAdapters.cosmos.UndelegationEntry[]
    >(allUndelegationsEntries, validatorAddress, []),
)

export const getRewardsAmountByValidatorAddress = memoize(
  (allRewards: Record<PubKey, chainAdapters.cosmos.Reward[]>, validatorAddress: PubKey) => {
    return get<
      Record<PubKey, chainAdapters.cosmos.Reward[]>,
      PubKey,
      chainAdapters.cosmos.Reward[]
    >(allRewards, validatorAddress, [])
      .reduce((acc: BigNumber, rewardEntry: chainAdapters.cosmos.Reward) => {
        acc = acc.plus(bnOrZero(rewardEntry.amount))
        return acc
      }, bnOrZero(0))
      .toString()
  },
  (allRewards: Record<string, chainAdapters.cosmos.Reward[]>, validatorAddress: PubKey) =>
    get<Record<PubKey, chainAdapters.cosmos.Reward[]>, PubKey, chainAdapters.cosmos.Reward[]>(
      allRewards,
      validatorAddress,
      [],
    ),
)

export const getTotalCryptoAmount = (delegationsAmount: string, undelegationsAmount: string) =>
  bnOrZero(delegationsAmount).plus(bnOrZero(undelegationsAmount)).toString()

export const selectActiveStakingOpportunityDataByAssetId = createDeepEqualOutputSelector(
  selectAllDelegationsCryptoAmountByAssetId,
  selectAllUnbondingsEntriesByAssetId,
  selectAllRewardsByAssetId,
  selectAllValidators,
  (
    allDelegationsAmount,
    allUndelegationsEntries,
    allRewards,
    allValidators,
  ): ActiveStakingOpportunity[] => {
    return Object.entries(allValidators).reduce(
      (acc: ActiveStakingOpportunity[], [validatorAddress, { apr, moniker, tokens }]) => {
        const delegationsAmount = allDelegationsAmount[validatorAddress] ?? '0'

        const undelegationsAmount = getUndelegationsAmountByValidatorAddress(
          allUndelegationsEntries,
          validatorAddress,
        )

        const rewards = getRewardsAmountByValidatorAddress(allRewards, validatorAddress)

        const cryptoAmount = getTotalCryptoAmount(delegationsAmount, undelegationsAmount)

        if (bnOrZero(cryptoAmount).gt(0) || bnOrZero(rewards).gt(0)) {
          acc.push({
            address: validatorAddress,
            apr,
            moniker,
            tokens,
            cryptoAmount,
            rewards,
          })
        }

        return acc
      },
      [],
    )
  },
)
