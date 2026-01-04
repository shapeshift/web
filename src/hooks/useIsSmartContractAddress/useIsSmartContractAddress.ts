import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { skipToken, useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { useMemo } from 'react'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { isSmartContractAddress } from '@/lib/address/utils'
import { getGraphQLClient } from '@/lib/graphql/client'

const IS_SMART_CONTRACT_QUERY = gql`
  query IsSmartContractAddress($address: String!, $chainId: String!) {
    evm {
      isSmartContractAddress(address: $address, chainId: $chainId)
    }
  }
`

type IsSmartContractResponse = {
  evm: {
    isSmartContractAddress: boolean
  }
}

const checkIsSmartContractAddress = async (
  userAddress: string,
  chainId: ChainId,
): Promise<boolean> => {
  const isGraphQLEnabled = getConfig().VITE_FEATURE_GRAPHQL_POC

  if (isGraphQLEnabled) {
    const client = getGraphQLClient()
    const result = await client.request<IsSmartContractResponse>(IS_SMART_CONTRACT_QUERY, {
      address: userAddress,
      chainId,
    })
    return result.evm.isSmartContractAddress
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
