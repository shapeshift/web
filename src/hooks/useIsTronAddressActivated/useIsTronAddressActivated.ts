import type { ChainId } from '@shapeshiftoss/caip'
import { tronChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { assertGetTronChainAdapter } from '@/lib/utils/tron'

const checkTronAddressActivated = async (
  to: string | undefined,
  chainId: ChainId | undefined,
): Promise<boolean | undefined> => {
  if (!to || !chainId || chainId !== tronChainId) return undefined
  if (!to.startsWith('T')) return undefined

  try {
    const adapter = assertGetTronChainAdapter(chainId)
    const rpcUrl = adapter.httpProvider.getRpcUrl()

    const response = await fetch(`${rpcUrl}/wallet/getaccount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: to, visible: true }),
    })

    if (!response.ok) return undefined

    const data = await response.json()

    // Activated accounts have an 'address' field; non-activated accounts return {}
    return !!data?.address
  } catch (error) {
    console.error('Failed to check Tron address activation status:', error)
    return undefined
  }
}

export const useIsTronAddressActivated = (to: string | undefined, chainId: ChainId | undefined) => {
  return useQuery({
    queryKey: ['isTronAddressActivated', to, chainId],
    queryFn: () => checkTronAddressActivated(to, chainId),
    enabled: Boolean(to) && to?.startsWith('T') && chainId === tronChainId,
    staleTime: 30_000,
    refetchInterval: false,
  })
}
