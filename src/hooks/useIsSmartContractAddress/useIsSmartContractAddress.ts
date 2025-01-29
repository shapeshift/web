import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { isSmartContractAddress } from 'lib/address/utils'

// For use outside of react-query, while still leveraging caching
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
    queryFn: () => isSmartContractAddress(userAddress, chainId),
    // Assume if an address isn't a sc, it never will be in the lifetime of a tab
    staleTime: Infinity,
  })
}
export const useIsSmartContractAddress = (address: string, chainId: ChainId) => {
  // Lowercase the address to ensure proper caching
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
        ? () => isSmartContractAddress(userAddress, chainId)
        : skipToken,
    // Assume if an address isn't a sc, it never will be in the lifetime of a tab
    staleTime: Infinity,
  })

  return query
}
