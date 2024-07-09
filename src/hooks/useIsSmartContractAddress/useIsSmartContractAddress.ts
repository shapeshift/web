import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { isSmartContractAddress } from 'lib/address/utils'

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
  })

  return query
}
