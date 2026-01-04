import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { isSmartContractAddress } from '@/lib/address/utils'
import { loadIsSmartContractAddress } from '@/lib/graphql/dataLoaders'

const checkIsSmartContractAddress = (userAddress: string, chainId: ChainId): Promise<boolean> => {
  const isGraphQLEnabled = getConfig().VITE_FEATURE_GRAPHQL_POC

  if (isGraphQLEnabled) {
    return loadIsSmartContractAddress(userAddress, chainId)
  }

  return isSmartContractAddress(userAddress, chainId)
}

export const fetchIsSmartContractAddressQuery = (userAddress: string, chainId: ChainId) => {
  if (!isEvmChainId(chainId)) return Promise.resolve(false)
  if (!userAddress.length) return Promise.resolve(false)

  return queryClient.fetchQuery({
    queryKey: [
      'isSmartContractAddress',
      {
        userAddress,
        chainId,
      },
    ],
    queryFn: () => checkIsSmartContractAddress(userAddress, chainId),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
export const useIsSmartContractAddress = (address: string, chainId: ChainId) => {
  const userAddress = useMemo(() => address.toLowerCase(), [address])

  const query = useQuery({
    queryKey: [
      'isSmartContractAddress',
      {
        userAddress,
        chainId,
      },
    ],
    queryFn:
      isEvmChainId(chainId) && Boolean(userAddress.length)
        ? () => checkIsSmartContractAddress(userAddress, chainId)
        : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return query
}
