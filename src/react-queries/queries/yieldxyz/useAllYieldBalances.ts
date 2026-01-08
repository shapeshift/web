import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { fetchAggregateBalances } from '@/lib/yieldxyz/api'
import { augmentYieldBalances } from '@/lib/yieldxyz/augment'
import { CHAIN_ID_TO_YIELD_NETWORK, SUPPORTED_YIELD_NETWORKS } from '@/lib/yieldxyz/constants'
import type {
  AugmentedYieldBalance,
  YieldBalanceType,
  YieldBalanceValidator,
  YieldNetwork,
} from '@/lib/yieldxyz/types'
import { YieldBalanceType as YieldBalanceTypeEnum } from '@/lib/yieldxyz/types'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseAllYieldBalancesOptions = {
  networks?: YieldNetwork[]
  accountIds?: string[]
}

export type AugmentedYieldBalanceWithAccountId = AugmentedYieldBalance & {
  accountId: AccountId
  highestAmountUsdValidator?: string
}

export type ValidatorBalanceAggregate = {
  validator: YieldBalanceValidator
  totalUsd: string
  totalCrypto: string
}

export type YieldBalanceAggregate = {
  totalUsd: string
  totalCrypto: string
  hasValidators: boolean
  byValidator: Record<string, ValidatorBalanceAggregate>
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

const EMPTY_NORMALIZED: NormalizedYieldBalances = {
  raw: [],
  byType: {},
  byValidatorAddress: {},
  validatorAddresses: [],
  byValidator: {},
  validators: [],
  hasValidatorPositions: false,
  totalUsd: '0',
}

const normalizeBalances = (
  rawBalances: AugmentedYieldBalanceWithAccountId[],
): NormalizedYieldBalances => {
  if (rawBalances.length === 0) return EMPTY_NORMALIZED

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
        aggregatedAmount: bnOrZero(existingByType.aggregatedAmount).plus(balance.amount).toFixed(),
        aggregatedAmountUsd: bnOrZero(existingByType.aggregatedAmountUsd)
          .plus(balance.amountUsd)
          .toFixed(),
      }
    }

    if (validatorAddr) {
      validatorAddressSet.add(validatorAddr)
      if (!byValidatorAddress[validatorAddr]) byValidatorAddress[validatorAddr] = {}

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

    const claimAction = claimableBalance?.pendingActions?.find(a =>
      a.type.toUpperCase().includes('CLAIM'),
    )
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
}

export const useAllYieldBalances = (options: UseAllYieldBalancesOptions = {}) => {
  const { networks = SUPPORTED_YIELD_NETWORKS, accountIds: filterAccountIds } = options
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const { accountNumber } = useYieldAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const accountIdsForAccountNumber = useMemo((): AccountId[] => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    if (!byChainId) return []
    return Object.values(byChainId).flat().filter(isSome)
  }, [accountIdsByAccountNumberAndChainId, accountNumber])

  const queryPayloads = useMemo(() => {
    if (!isConnected || accountIdsForAccountNumber.length === 0) return []

    const targetAccountIds = filterAccountIds ?? accountIdsForAccountNumber
    const payloads: { address: string; network: string; chainId: ChainId; accountId: AccountId }[] =
      []

    for (const accountId of targetAccountIds) {
      if (!accountIdsForAccountNumber.includes(accountId)) continue

      const { chainId, account } = fromAccountId(accountId)
      const network = CHAIN_ID_TO_YIELD_NETWORK[chainId]

      if (network && networks.includes(network)) {
        payloads.push({ address: account, network, chainId, accountId })
      }
    }

    return payloads
  }, [isConnected, accountIdsForAccountNumber, filterAccountIds, networks])

  const { addressToAccountId, addressToChainId } = useMemo(() => {
    const accountIdMap: Record<string, AccountId> = {}
    const chainIdMap: Record<string, ChainId> = {}
    for (const payload of queryPayloads) {
      const key = payload.address.toLowerCase()
      accountIdMap[`${key}:${payload.network}`] = payload.accountId
      chainIdMap[key] = payload.chainId
    }
    return { addressToAccountId: accountIdMap, addressToChainId: chainIdMap }
  }, [queryPayloads])

  const { data: rawData, ...queryResult } = useQuery<
    Record<string, AugmentedYieldBalanceWithAccountId[]>
  >({
    queryKey: ['yieldxyz', 'allBalances', queryPayloads],
    queryFn:
      queryPayloads.length > 0
        ? async () => {
            const uniqueQueries = queryPayloads.map(({ address, network }) => ({
              address,
              network,
            }))

            const response = await fetchAggregateBalances(uniqueQueries)
            const balanceMap: Record<string, AugmentedYieldBalanceWithAccountId[]> = {}

            for (const item of response.items) {
              const firstBalance = item.balances[0]
              if (!firstBalance) continue

              const chainId = addressToChainId[firstBalance.address.toLowerCase()]

              const augmentedBalances = augmentYieldBalances(item.balances, chainId)

              let highestAmountUsd = bnOrZero(0)
              let highestAmountUsdValidator: string | undefined

              for (const balance of augmentedBalances) {
                const usd = bnOrZero(balance.amountUsd)
                if (balance.validator?.address && usd.gt(highestAmountUsd)) {
                  highestAmountUsd = usd
                  highestAmountUsdValidator = balance.validator.address
                }
              }

              if (!balanceMap[item.yieldId]) {
                balanceMap[item.yieldId] = []
              }

              for (const balance of augmentedBalances) {
                const network = item.yieldId.split('-')[0]
                const lookupKey = `${balance.address.toLowerCase()}:${network}`
                let accountId = addressToAccountId[lookupKey]

                if (!accountId && chainId) {
                  accountId = toAccountId({ chainId, account: balance.address })
                }

                if (!accountId) continue

                balanceMap[item.yieldId].push({
                  ...balance,
                  accountId,
                  highestAmountUsdValidator,
                })
              }
            }

            return balanceMap
          }
        : skipToken,
    staleTime: 60000,
  })

  const data = useMemo(() => {
    if (!rawData) return undefined

    const aggregatedByYield: Record<string, YieldBalanceAggregate> = {}
    const normalizedByYield: Record<string, NormalizedYieldBalances> = {}

    for (const [yieldId, balances] of Object.entries(rawData)) {
      let totalUsd = bnOrZero(0)
      let totalCrypto = bnOrZero(0)
      const byValidator: Record<string, ValidatorBalanceAggregate> = {}

      for (const balance of balances) {
        const amount = bnOrZero(balance.amount)
        const amountUsd = bnOrZero(balance.amountUsd)
        if (amount.lte(0)) continue

        totalUsd = totalUsd.plus(amountUsd)
        totalCrypto = totalCrypto.plus(amount)

        if (!balance.validator) continue

        const addr = balance.validator.address
        const existing = byValidator[addr]
        if (existing) {
          existing.totalUsd = bnOrZero(existing.totalUsd).plus(amountUsd).toFixed()
          existing.totalCrypto = bnOrZero(existing.totalCrypto).plus(amount).toFixed()
        } else {
          byValidator[addr] = {
            validator: balance.validator,
            totalUsd: amountUsd.toFixed(),
            totalCrypto: amount.toFixed(),
          }
        }
      }

      aggregatedByYield[yieldId] = {
        totalUsd: totalUsd.toFixed(),
        totalCrypto: totalCrypto.toFixed(),
        hasValidators: Object.keys(byValidator).length > 0,
        byValidator,
      }

      normalizedByYield[yieldId] = normalizeBalances(balances)
    }

    return {
      byYieldId: rawData,
      aggregated: aggregatedByYield,
      normalized: normalizedByYield,
    }
  }, [rawData])

  return { data, ...queryResult }
}
