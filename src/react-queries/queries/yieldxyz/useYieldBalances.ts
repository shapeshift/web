import type { AccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import type { AugmentedYieldBalanceWithAccountId } from './useAllYieldBalances'
import { useAllYieldBalances } from './useAllYieldBalances'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { YieldBalanceType, YieldBalanceValidator } from '@/lib/yieldxyz/types'
import { YieldBalanceType as YieldBalanceTypeEnum } from '@/lib/yieldxyz/types'

type UseYieldBalancesParams = {
  yieldId: string
  accountId?: AccountId
}

export type AggregatedBalance = AugmentedYieldBalanceWithAccountId & {
  aggregatedAmount: string
  aggregatedAmountUsd: string
}

type BalancesByType = Partial<Record<YieldBalanceType, AggregatedBalance>>

type PendingAction = {
  type: string
  passthrough: string
}

export type ValidatorSummary = {
  address: string
  validator: YieldBalanceValidator
  byType: BalancesByType
  totalUsd: string
  hasActive: boolean
  hasEntering: boolean
  hasExiting: boolean
  hasClaimable: boolean
  claimAction: PendingAction | undefined
}

export type NormalizedYieldBalances = {
  raw: AugmentedYieldBalanceWithAccountId[]
  byType: BalancesByType
  byValidatorAddress: Record<string, BalancesByType>
  validatorAddresses: string[]
  byValidator: Record<string, ValidatorSummary>
  validators: ValidatorSummary[]
  hasValidatorPositions: boolean
  totalUsd: string
}

export const useYieldBalances = ({ yieldId, accountId }: UseYieldBalancesParams) => {
  const { data: allBalances, ...queryResult } = useAllYieldBalances()

  const data = useMemo((): NormalizedYieldBalances | undefined => {
    if (!allBalances) return undefined

    const emptyResult: NormalizedYieldBalances = {
      raw: [],
      byType: {},
      byValidatorAddress: {},
      validatorAddresses: [],
      byValidator: {},
      validators: [],
      hasValidatorPositions: false,
      totalUsd: '0',
    }

    const yieldBalances = allBalances[yieldId]
    if (!yieldBalances || yieldBalances.length === 0) {
      return emptyResult
    }

    const rawBalances = accountId
      ? yieldBalances.filter(b => b.accountId === accountId)
      : yieldBalances

    if (rawBalances.length === 0) {
      return emptyResult
    }

    const byType: BalancesByType = {}
    const byValidatorAddress: Record<string, BalancesByType> = {}
    const validatorAddressSet = new Set<string>()

    for (const balance of rawBalances) {
      const type = balance.type as YieldBalanceType
      const validatorAddr = balance.validator?.address

      const existingByType = byType[type]
      if (!existingByType) {
        byType[type] = {
          ...balance,
          aggregatedAmount: balance.amount,
          aggregatedAmountUsd: balance.amountUsd,
        }
      } else {
        byType[type] = {
          ...existingByType,
          aggregatedAmount: bnOrZero(existingByType.aggregatedAmount)
            .plus(balance.amount)
            .toFixed(),
          aggregatedAmountUsd: bnOrZero(existingByType.aggregatedAmountUsd)
            .plus(balance.amountUsd)
            .toFixed(),
        }
      }

      if (validatorAddr) {
        validatorAddressSet.add(validatorAddr)

        if (!byValidatorAddress[validatorAddr]) {
          byValidatorAddress[validatorAddr] = {}
        }

        const validatorBalances = byValidatorAddress[validatorAddr]
        const existingValidatorByType = validatorBalances[type]

        if (!existingValidatorByType) {
          validatorBalances[type] = {
            ...balance,
            aggregatedAmount: balance.amount,
            aggregatedAmountUsd: balance.amountUsd,
          }
        } else {
          validatorBalances[type] = {
            ...existingValidatorByType,
            aggregatedAmount: bnOrZero(existingValidatorByType.aggregatedAmount)
              .plus(balance.amount)
              .toFixed(),
            aggregatedAmountUsd: bnOrZero(existingValidatorByType.aggregatedAmountUsd)
              .plus(balance.amountUsd)
              .toFixed(),
          }
        }
      }
    }

    const validatorAddresses = Array.from(validatorAddressSet)

    const validatorMetaMap = new Map<string, YieldBalanceValidator>()
    for (const balance of rawBalances) {
      if (balance.validator && !validatorMetaMap.has(balance.validator.address)) {
        validatorMetaMap.set(balance.validator.address, balance.validator)
      }
    }

    const byValidator: Record<string, ValidatorSummary> = {}
    let totalUsdAccumulator = bnOrZero(0)

    for (const address of validatorAddresses) {
      const balancesByType = byValidatorAddress[address]
      const validator = validatorMetaMap.get(address)
      if (!validator) continue

      const activeBalance = balancesByType[YieldBalanceTypeEnum.Active]
      const enteringBalance = balancesByType[YieldBalanceTypeEnum.Entering]
      const exitingBalance = balancesByType[YieldBalanceTypeEnum.Exiting]
      const claimableBalance = balancesByType[YieldBalanceTypeEnum.Claimable]

      const hasActive = bnOrZero(activeBalance?.aggregatedAmount).gt(0)
      const hasEntering = bnOrZero(enteringBalance?.aggregatedAmount).gt(0)
      const hasExiting = bnOrZero(exitingBalance?.aggregatedAmount).gt(0)
      const hasClaimable = bnOrZero(claimableBalance?.aggregatedAmount).gt(0)

      const validatorTotalUsd = Object.values(balancesByType).reduce(
        (acc, b) => acc.plus(bnOrZero(b?.aggregatedAmountUsd)),
        bnOrZero(0),
      )

      const claimAction = claimableBalance?.pendingActions?.find(a => a.type === 'CLAIM_REWARDS')

      const hasAnyPosition = hasActive || hasEntering || hasExiting || hasClaimable
      if (!hasAnyPosition) continue

      totalUsdAccumulator = totalUsdAccumulator.plus(validatorTotalUsd)

      byValidator[address] = {
        address,
        validator,
        byType: balancesByType,
        totalUsd: validatorTotalUsd.toFixed(),
        hasActive,
        hasEntering,
        hasExiting,
        hasClaimable,
        claimAction,
      }
    }

    const validators = Object.values(byValidator).sort((a, b) =>
      bnOrZero(b.totalUsd).minus(bnOrZero(a.totalUsd)).toNumber(),
    )

    return {
      raw: rawBalances,
      byType,
      byValidatorAddress,
      validatorAddresses,
      byValidator,
      validators,
      hasValidatorPositions: validators.length > 1,
      totalUsd: totalUsdAccumulator.toFixed(),
    }
  }, [allBalances, yieldId, accountId])

  return { ...queryResult, data }
}
