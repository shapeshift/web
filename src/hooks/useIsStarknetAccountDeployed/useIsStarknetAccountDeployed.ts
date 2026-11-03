import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, starknetChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { isStarknetChainAdapter } from '@/lib/utils/starknet'

const checkStarknetAccountDeployment = async (accountId: AccountId | undefined) => {
  if (!accountId) return true

  const { chainId } = fromAccountId(accountId)
  if (chainId !== starknetChainId) return true

  try {
    const chainAdapterManager = getChainAdapterManager()
    const adapter = chainAdapterManager.get(chainId)
    if (!isStarknetChainAdapter(adapter)) return true

    const fromAddress = fromAccountId(accountId).account
    return await adapter.isAccountDeployed(fromAddress)
  } catch (error) {
    console.error('Failed to check Starknet account deployment status:', error)
    return true
  }
}

export const useIsStarknetAccountDeployed = (accountId: AccountId | undefined) => {
  return useQuery({
    queryKey: ['isStarknetAccountDeployed', accountId],
    queryFn: () => checkStarknetAccountDeployment(accountId),
    enabled: Boolean(accountId),
    staleTime: 30000,
    refetchInterval: false,
  })
}
