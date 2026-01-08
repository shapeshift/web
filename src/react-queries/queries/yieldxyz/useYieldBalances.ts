import type { AccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import type { AugmentedYieldBalanceWithAccountId } from './useAllYieldBalances'
import { useAllYieldBalances } from './useAllYieldBalances'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { YieldBalanceType } from '@/lib/yieldxyz/types'

type UseYieldBalancesParams = {
  yieldId: string
  accountId?: AccountId
}

export type AggregatedBalance = AugmentedYieldBalanceWithAccountId & {
  aggregatedAmount: string
  aggregatedAmountUsd: string
}

type BalancesByType = Partial<Record<YieldBalanceType, AggregatedBalance>>

export type NormalizedYieldBalances = {
  raw: AugmentedYieldBalanceWithAccountId[]
  byType: BalancesByType
  byValidatorAddress: Record<string, BalancesByType>
  validatorAddresses: string[]
}

export const useYieldBalances = ({ yieldId, accountId }: UseYieldBalancesParams) => {
  const { data: allBalances, ...queryResult } = useAllYieldBalances()

  const data = useMemo((): NormalizedYieldBalances | undefined => {
    if (!allBalances) return undefined

    const yieldBalances = allBalances[yieldId]
    if (!yieldBalances || yieldBalances.length === 0) {
      return {
        raw: [],
        byType: {},
        byValidatorAddress: {},
        validatorAddresses: [],
      }
    }

    const rawBalances = accountId
      ? yieldBalances.filter(b => b.accountId === accountId)
      : yieldBalances

    if (rawBalances.length === 0) {
      return {
        raw: [],
        byType: {},
        byValidatorAddress: {},
        validatorAddresses: [],
      }
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

    return {
      raw: rawBalances,
      byType,
      byValidatorAddress,
      validatorAddresses: Array.from(validatorAddressSet),
    }
  }, [allBalances, yieldId, accountId])

  return { ...queryResult, data }
}
