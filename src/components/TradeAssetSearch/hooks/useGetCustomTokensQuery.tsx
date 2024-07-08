import { type ChainId } from '@shapeshiftoss/caip'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import type { TokenMetadataResponse } from 'alchemy-sdk'
import { useCallback } from 'react'
import { isAddress } from 'viem'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
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
  data: UseQueryResult<TokenMetadata | null, Error>[]
  isLoading: boolean
}

type CustomTokenQueryKey = ['customTokens', string, ChainId]

const getCustomTokenQueryKey = (contractAddress: string, chainId: ChainId): CustomTokenQueryKey => [
  'customTokens',
  contractAddress,
  chainId,
]

export const useGetCustomTokensQuery = ({
  contractAddress,
  chainIds,
}: UseGetCustomTokensQueryProps): UseGetCustomTokenQueryReturn => {
  const customTokenImportEnabled = useFeatureFlag('CustomTokenImport')

  const getTokenMetadata = useCallback(
    async (chainId: ChainId) => {
      const alchemy = getAlchemyInstanceByChainId(chainId)
      const tokenMetadataResponse = await alchemy.core.getTokenMetadata(contractAddress)
      // TODO: get price from somewhere
      return { ...tokenMetadataResponse, chainId, contractAddress, price: '0' }
    },
    [contractAddress],
  )

  const getQueryFn = useCallback(
    (chainId: ChainId) => () =>
      isAddress(contractAddress, { strict: false }) ? getTokenMetadata(chainId) : null,
    [contractAddress, getTokenMetadata],
  )

  const customTokensQuery = useQueries({
    queries: chainIds.map(chainId => ({
      queryKey: getCustomTokenQueryKey(contractAddress, chainId),
      queryFn: getQueryFn(chainId),
      enabled: customTokenImportEnabled,
      staleTime: Infinity,
    })),
  })

  const isLoading = customTokensQuery.some(query => query.isLoading)

  return { data: customTokensQuery, isLoading }
}
