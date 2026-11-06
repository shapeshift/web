import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, starknetChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { isStarknetChainAdapter } from '@/lib/utils/starknet'

const checkStarknetAccountDeployment = (accountId: AccountId | undefined) => {
  if (!accountId) return true

  const { chainId } = fromAccountId(accountId)
  if (chainId !== starknetChainId) return true

  const adapter = getChainAdapterManager().get(chainId)
  if (!isStarknetChainAdapter(adapter)) return true

  return adapter.isAccountDeployed(fromAccountId(accountId).account)
}

export const useIsStarknetAccountDeployed = (accountId: AccountId | undefined) => {
  return useQuery({
    queryKey: ['isStarknetAccountDeployed', accountId],
    queryFn: () => checkStarknetAccountDeployment(accountId),
    enabled: Boolean(accountId),
    staleTime: query => (query.state.data === false ? 0 : 30000),
    refetchOnMount: true,
    refetchInterval: false,
  })
}
