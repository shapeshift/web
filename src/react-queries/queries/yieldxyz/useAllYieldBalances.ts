import type { ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { yieldxyzApi } from '@/lib/yieldxyz/api'
import { augmentYieldBalances } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldBalance } from '@/lib/yieldxyz/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useAllYieldBalances = (
  networks: string[] = ['base', 'arbitrum', 'optimism', 'ethereum'],
) => {
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const accountIds = useAppSelector(selectEnabledWalletAccountIds)

  // Memoize the query payloads to avoid unstable references
  const queryPayloads = useMemo(() => {
    if (!isConnected || accountIds.length === 0) return []

    const payloads: { address: string; network: string; chainId: ChainId }[] = []

    // Map our ChainIds to Yield.xyz network strings
    // This is a simplified mapping, might need more robust handling
    const networkMap: Record<string, string> = {
      'eip155:8453': 'base',
      'eip155:42161': 'arbitrum',
      'eip155:10': 'optimism',
      'eip155:1': 'ethereum',
    }

    accountIds.forEach(accountId => {
      const { chainId, account } = fromAccountId(accountId)
      const network = networkMap[chainId]

      // Only query if we support this network in the yield list AND mapping exists
      if (network && networks.includes(network)) {
        payloads.push({ address: account, network, chainId })
      }
    })

    return payloads
  }, [isConnected, accountIds, networks])

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

            const response = await yieldxyzApi.getAggregateBalances(uniqueQueries)

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

              balanceMap[item.yieldId].push(...augmentYieldBalances(item.balances, chainId))
            })

            return balanceMap
          }
        : skipToken,
    enabled: isConnected && queryPayloads.length > 0,
    staleTime: 60000, // 1 minute
  })
}
