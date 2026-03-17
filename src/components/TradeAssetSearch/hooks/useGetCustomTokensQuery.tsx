import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { getAssetNamespaceFromChainId } from '@shapeshiftoss/utils'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'
import { useCallback, useMemo } from 'react'
import { isAddress } from 'viem'

import { getConfig } from '@/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { isSolanaAddress } from '@/lib/utils/isSolanaAddress'
import { mergeQueryOutputs } from '@/react-queries/helpers'

type TokenMetadataResponse = {
  name: string
  symbol: string
  decimals: number | null
  logo: string | null
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
}: UseGetCustomTokensQueryProps): UseQueryResult<MinimalAsset[], Error[]> => {
  const customTokenImportEnabled = useFeatureFlag('CustomTokenImport')

  const getCustomToken = useCallback(
    async (chainId: ChainId): Promise<MinimalAsset | undefined> => {
      try {
        const { data } = await axios.get<TokenMetadataResponse>(
          `${getConfig().VITE_PROXY_API_BASE_URL}/api/v1/tokens/metadata`,
          {
            params: {
              chainId,
              tokenAddress: contractAddress,
            },
          },
        )

        if (data.decimals === null) return undefined

        const assetId = toAssetId({
          chainId,
          assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
          assetReference: contractAddress,
        })

        return {
          assetId,
          name: data.name,
          symbol: data.symbol,
          precision: data.decimals,
          icon: data.logo ?? undefined,
        }
      } catch (err) {
        if (isAxiosError(err) && (err.response?.status ?? 0) >= 500) throw err
        return undefined
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
      if (!isValidEvmAddress && !isValidSolanaAddress) return skipToken
      return getCustomToken(chainId)
    },
    [getCustomToken, isValidEvmAddress, isValidSolanaAddress],
  )

  const isMinimalAsset = (
    result: MinimalAsset | typeof skipToken | undefined,
  ): result is MinimalAsset => result !== undefined && result !== skipToken

  const customTokenQueries = useQueries({
    queries: chainIds.map(chainId => ({
      queryKey: getCustomTokenQueryKey(contractAddress, chainId),
      queryFn: getQueryFn(chainId),
      enabled: customTokenImportEnabled,
      staleTime: Infinity,
    })),
    combine: queries => mergeQueryOutputs(queries, results => results.filter(isMinimalAsset)),
  })

  return customTokenQueries
}
