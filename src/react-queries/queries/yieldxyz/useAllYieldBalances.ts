import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  cosmosChainId,
  ethChainId,
  fromAccountId,
  gnosisChainId,
  monadChainId,
  nearChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  toAccountId,
  tronChainId,
} from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getAggregateBalances } from '@/lib/yieldxyz/api'
import { augmentYieldBalances } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldBalance } from '@/lib/yieldxyz/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseAllYieldBalancesOptions = {
  networks?: string[]
  accountIds?: string[]
}

export type AugmentedYieldBalanceWithAccountId = AugmentedYieldBalance & {
  accountId: AccountId
  highestAmountUsdValidator?: string
}

const DEFAULT_NETWORKS = [
  'ethereum',
  'arbitrum',
  'base',
  'optimism',
  'polygon',
  'gnosis',
  'avalanche-c',
  'binance',
  'solana',
  'cosmos',
  'near',
  'tron',
  'sui',
  'monad',
  'plasma',
]

const CHAIN_ID_TO_NETWORK: Record<ChainId, string> = {
  [ethChainId]: 'ethereum',
  [arbitrumChainId]: 'arbitrum',
  [baseChainId]: 'base',
  [optimismChainId]: 'optimism',
  [polygonChainId]: 'polygon',
  [gnosisChainId]: 'gnosis',
  [avalancheChainId]: 'avalanche-c',
  [bscChainId]: 'binance',
  [cosmosChainId]: 'cosmos',
  [solanaChainId]: 'solana',
  [nearChainId]: 'near',
  [tronChainId]: 'tron',
  [suiChainId]: 'sui',
  [monadChainId]: 'monad',
  [plasmaChainId]: 'plasma',
}

export const useAllYieldBalances = (options: UseAllYieldBalancesOptions = {}) => {
  const { networks = DEFAULT_NETWORKS, accountIds: filterAccountIds } = options
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
      const network = CHAIN_ID_TO_NETWORK[chainId]

      if (network && networks.includes(network)) {
        payloads.push({ address: account, network, chainId, accountId })
      }
    }

    return payloads
  }, [isConnected, accountIds, filterAccountIds, networks])

  const addressToAccountId = useMemo(() => {
    const map: Record<string, AccountId> = {}
    for (const payload of queryPayloads) {
      map[`${payload.address.toLowerCase()}:${payload.network}`] = payload.accountId
    }
    return map
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

            const response = await getAggregateBalances(uniqueQueries)
            const balanceMap: Record<string, AugmentedYieldBalanceWithAccountId[]> = {}

            for (const item of response.items) {
              const firstBalance = item.balances[0]
              if (!firstBalance) continue

              const relevantPayload = queryPayloads.find(
                p => p.address.toLowerCase() === firstBalance.address.toLowerCase(),
              )
              const chainId = relevantPayload?.chainId

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
