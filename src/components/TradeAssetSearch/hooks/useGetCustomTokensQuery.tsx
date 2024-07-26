import { type ChainId } from '@shapeshiftoss/caip'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import type { TokenMetadataResponse } from 'alchemy-sdk'
import { useCallback, useMemo } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'
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

type CustomTokenQueryKey = ['customTokens', string, ChainId]

const getCustomTokenQueryKey = (contractAddress: string, chainId: ChainId): CustomTokenQueryKey => [
  'customTokens',
  contractAddress,
  chainId,
]

export const useGetCustomTokensQuery = ({
  contractAddress,
  chainIds,
}: UseGetCustomTokensQueryProps): UseQueryResult<(TokenMetadata | null)[], Error[]> => {
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

  const isValidEvmAddress = useMemo(
    () => isAddress(contractAddress, { strict: false }),
    [contractAddress],
  )

  const getQueryFn = useCallback(
    (chainId: ChainId) => () => getTokenMetadata(chainId),
    [getTokenMetadata],
  )

  const customTokenQueries = useQueries({
    queries: isValidEvmAddress
      ? chainIds.map(chainId => ({
          queryKey: getCustomTokenQueryKey(contractAddress, chainId),
          queryFn: getQueryFn(chainId),
          enabled: customTokenImportEnabled,
          staleTime: Infinity,
        }))
      : [],
    combine: queries => mergeQueryOutputs(queries, results => results),
  })

  return customTokenQueries
}
