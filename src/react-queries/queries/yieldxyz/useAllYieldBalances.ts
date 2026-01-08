import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fetchAggregateBalances } from '@/lib/yieldxyz/api'
import { augmentYieldBalances } from '@/lib/yieldxyz/augment'
import { CHAIN_ID_TO_YIELD_NETWORK, SUPPORTED_YIELD_NETWORKS } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldBalance, YieldNetwork } from '@/lib/yieldxyz/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseAllYieldBalancesOptions = {
  networks?: YieldNetwork[]
  accountIds?: string[]
}

export type AugmentedYieldBalanceWithAccountId = AugmentedYieldBalance & {
  accountId: AccountId
  highestAmountUsdValidator?: string
}

export const useAllYieldBalances = (options: UseAllYieldBalancesOptions = {}) => {
  const { networks = SUPPORTED_YIELD_NETWORKS, accountIds: filterAccountIds } = options
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const accountIds = useAppSelector(selectEnabledWalletAccountIds)

  const queryPayloads = useMemo(() => {
    if (!isConnected || accountIds.length === 0) return []

    const targetAccountIds = filterAccountIds ?? accountIds
    const payloads: { address: string; network: string; chainId: ChainId; accountId: AccountId }[] =
      []

    for (const accountId of targetAccountIds) {
      if (!accountIds.includes(accountId)) continue

      const { chainId, account } = fromAccountId(accountId)
      const network = CHAIN_ID_TO_YIELD_NETWORK[chainId]

      if (network && networks.includes(network)) {
        payloads.push({ address: account, network, chainId, accountId })
      }
    }

    return payloads
  }, [isConnected, accountIds, filterAccountIds, networks])

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

  return useQuery<Record<string, AugmentedYieldBalanceWithAccountId[]>>({
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
    enabled: isConnected && queryPayloads.length > 0,
    staleTime: 60000,
  })
}
