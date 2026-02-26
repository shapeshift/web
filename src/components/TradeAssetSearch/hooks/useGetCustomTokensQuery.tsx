import type { ChainId } from '@shapeshiftoss/caip'
import { solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'
import { useCallback, useMemo } from 'react'
import { isAddress } from 'viem'

import { getConfig } from '@/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { isSolanaAddress } from '@/lib/utils/isSolanaAddress'
import { mergeQueryOutputs } from '@/react-queries/helpers'

type TokenMetadata = {
  name?: string
  symbol?: string
  decimals?: number
  logo?: string
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
}: UseGetCustomTokensQueryProps): UseQueryResult<(TokenMetadata | undefined)[], Error[]> => {
  const customTokenImportEnabled = useFeatureFlag('CustomTokenImport')

  const getTokenMetadata = useCallback(
    async (chainId: ChainId): Promise<TokenMetadata | undefined> => {
      try {
        const { data } = await axios.get<{
          chainId: ChainId
          tokenAddress: string
          name?: string
          symbol?: string
          decimals?: number
          logo?: string
        }>(`${getConfig().VITE_PROXY_API_BASE_URL}/api/v1/tokens/metadata`, {
          params: {
            chainId,
            tokenAddress: contractAddress,
          },
          timeout: 10_000,
        })

        return {
          name: data.name,
          symbol: data.symbol,
          decimals: data.decimals,
          chainId: data.chainId,
          contractAddress: data.tokenAddress,
          price: '0',
          logo: data.logo,
        }
      } catch (e) {
        if (isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 422)) {
          return undefined
        }

        throw e
      }
    },
    [contractAddress],
  )

  const isValidEvmAddress = useMemo(
    () => isAddress(contractAddress, { strict: false }),
    [contractAddress],
  )

  const isValidSolanaAddress = useMemo(() => isSolanaAddress(contractAddress), [contractAddress])

  const getQueryFn = useCallback(
    (chainId: ChainId) => () => {
      if (isValidSolanaAddress && chainId === solanaChainId) {
        return getTokenMetadata(chainId)
      } else if (isValidEvmAddress && isEvmChainId(chainId)) {
        return getTokenMetadata(chainId)
      } else {
        return skipToken
      }
    },
    [getTokenMetadata, isValidEvmAddress, isValidSolanaAddress],
  )

  const isTokenMetadata = (
    result: TokenMetadata | typeof skipToken | undefined,
  ): result is TokenMetadata => result !== undefined && result !== skipToken

  const customTokenQueries = useQueries({
    queries: chainIds.map(chainId => ({
      queryKey: getCustomTokenQueryKey(contractAddress, chainId),
      queryFn: getQueryFn(chainId),
      enabled: customTokenImportEnabled,
      staleTime: Infinity,
    })),
    combine: queries => mergeQueryOutputs(queries, results => results.filter(isTokenMetadata)),
  })

  return customTokenQueries
}
