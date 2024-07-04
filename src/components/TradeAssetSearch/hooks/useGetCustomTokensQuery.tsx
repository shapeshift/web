import { type ChainId } from '@shapeshiftoss/caip'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import type { TokenMetadataResponse } from 'alchemy-sdk'
import { useCallback, useMemo } from 'react'
import { isAddress } from 'viem'
import { getAlchemyInstanceByChainId } from 'lib/alchemySdkInstance'

type TokenMetadata = TokenMetadataResponse & {
  chainId: ChainId
  contractAddress: string
  price: string
}

type UseGetCustomTokensQueryProps = {
  contractAddress: string
  chainIds: ChainId[]
}

type UseGetCustomTokenQueryReturn = {
  data: UseQueryResult<TokenMetadata | undefined, Error>[]
  isLoading: boolean
}

export const useGetCustomTokensQuery = ({
  contractAddress,
  chainIds,
}: UseGetCustomTokensQueryProps): UseGetCustomTokenQueryReturn => {
  const queryKey = useMemo(() => ['customTokens', contractAddress], [contractAddress])

  const getTokenMetadata = useCallback(
    async (chainId: ChainId) => {
      const alchemy = getAlchemyInstanceByChainId(chainId)
      const tokenMetadataResponse = await alchemy.core.getTokenMetadata(contractAddress)
      // TODO: get price from somewhere
      return { ...tokenMetadataResponse, chainId, contractAddress, price: '0' }
    },
    [contractAddress],
  )

  const queryFn = useCallback(
    (chainId: ChainId) =>
      isAddress(contractAddress, { strict: false }) ? getTokenMetadata(chainId) : undefined,
    [contractAddress, getTokenMetadata],
  )

  const customTokensQuery = useQueries({
    queries: chainIds.map(chainId => ({
      queryKey: [queryKey, chainId],
      queryFn: () => queryFn(chainId),
      enabled: true,
      staleTime: Infinity,
    })),
  })

  const isLoading = customTokensQuery.some(query => query.isLoading)

  return { data: customTokensQuery, isLoading }
}
