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
    return await assertGetTronChainAdapter(chainId).httpProvider.isAccountActivated(to)
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
