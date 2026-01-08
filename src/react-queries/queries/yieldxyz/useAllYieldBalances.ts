import type { ChainId } from '@shapeshiftoss/caip'
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
  tronChainId,
} from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { getAggregateBalances } from '@/lib/yieldxyz/api'
import { augmentYieldBalances } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldBalance } from '@/lib/yieldxyz/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseAllYieldBalancesOptions = {
  networks?: string[]
  accountIds?: string[]
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

export const useAllYieldBalances = (options: UseAllYieldBalancesOptions = {}) => {
  const { networks = DEFAULT_NETWORKS, accountIds: filterAccountIds } = options
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const accountIds = useAppSelector(selectEnabledWalletAccountIds)

  const networkMap: Record<string, string> = useMemo(
    () => ({
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
    }),
    [],
  )

  const queryPayloads = useMemo(() => {
    if (!isConnected || accountIds.length === 0) return []

    const targetAccountIds = filterAccountIds ?? accountIds

    const payloads: { address: string; network: string; chainId: ChainId }[] = []

    targetAccountIds.forEach(accountId => {
      if (!accountIds.includes(accountId)) return

      const { chainId, account } = fromAccountId(accountId)
      const network = networkMap[chainId]

      if (network && networks.includes(network)) {
        payloads.push({ address: account, network, chainId })
      }
    })

    return payloads
  }, [isConnected, accountIds, filterAccountIds, networks, networkMap])

  return useQuery<{ [yieldId: string]: AugmentedYieldBalance[] }>({
    queryKey: ['yieldxyz', 'allBalances', queryPayloads],
    queryFn:
      queryPayloads.length > 0
        ? async () => {
          // Deduplicate requests by (address, network) just in case, though the API handles it
          // We pass chainId along to augment the results correctly
          const uniqueQueries = queryPayloads.map(({ address, network }) => ({
            address,
            network,
          }))

          const response = await getAggregateBalances(uniqueQueries)

          // Flatten and map results by yieldId
          const balanceMap: { [yieldId: string]: AugmentedYieldBalance[] } = {}

          response.items.forEach(item => {
            // Find the chainId for this item's address results to augment correctly
            // This is a bit tricky since the response doesn't strictly echo back the chainId we sent
            // We infer it from the payloads we sent matching the address
            const relevantPayload = queryPayloads.find(
              p => p.address.toLowerCase() === item.balances[0]?.address.toLowerCase(), // heuristic match
            )
            const chainId = relevantPayload?.chainId

            if (!balanceMap[item.yieldId]) {
              balanceMap[item.yieldId] = []
            }

            const augmentedBalances = augmentYieldBalances(item.balances, chainId)

            // Find the validator with the highest USD balance for this yield
            let highestAmountUsd = 0
            let highestAmountUsdValidator: string | undefined

            augmentedBalances.forEach(balance => {
              const usd = parseFloat(balance.amountUsd)
              if (balance.validator?.address && usd > highestAmountUsd) {
                highestAmountUsd = usd
                highestAmountUsdValidator = balance.validator.address
              }
            })

            // Attach the highest amount validator to each balance
            const balancesWithHighestValidator = augmentedBalances.map(balance => ({
              ...balance,
              highestAmountUsdValidator
            }))

            balanceMap[item.yieldId].push(...balancesWithHighestValidator)
          })

          return balanceMap
        }
        : skipToken,
    enabled: isConnected && queryPayloads.length > 0,
    staleTime: 60000, // 1 minute
  })
}
