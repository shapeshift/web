import { Metaplex } from '@metaplex-foundation/js'
import type { ChainId } from '@shapeshiftoss/caip'
import { solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { Connection, PublicKey } from '@solana/web3.js'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries } from '@tanstack/react-query'
import type { TokenMetadataResponse } from 'alchemy-sdk'
import { useCallback, useMemo } from 'react'
import { isAddress } from 'viem'

import { getConfig } from '@/config'
import { isSolanaAddress } from '@/lib/utils/solanaAddress'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { getAlchemyInstanceByChainId } from '@/lib/alchemySdkInstance'
import { mergeQueryOutputs } from '@/react-queries/helpers'

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
}: UseGetCustomTokensQueryProps): UseQueryResult<(TokenMetadata | undefined)[], Error[]> => {
  const customTokenImportEnabled = useFeatureFlag('CustomTokenImport')

  const getEvmTokenMetadata = useCallback(
    async (chainId: ChainId) => {
      const alchemy = getAlchemyInstanceByChainId(chainId)
      const tokenMetadataResponse = await alchemy.core.getTokenMetadata(contractAddress)
      return { ...tokenMetadataResponse, chainId, contractAddress, price: '0' }
    },
    [contractAddress],
  )

  const getSolanaTokenMetadata = useCallback(
    async (mintAddress: string): Promise<TokenMetadata> => {
      const solanaRpcUrl = `${getConfig().VITE_ALCHEMY_SOLANA_BASE_URL}/${
        getConfig().VITE_ALCHEMY_API_KEY
      }`
      const connection = new Connection(solanaRpcUrl)
      const metaplex = Metaplex.make(connection)
      const metadata = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) })

      return {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.mint.currency.decimals,
        chainId: solanaChainId,
        contractAddress: mintAddress,
        price: '0',
        logo: metadata.json?.image ?? '',
      }
    },
    [],
  )

  const isValidEvmAddress = useMemo(
    () => isAddress(contractAddress, { strict: false }),
    [contractAddress],
  )

  const isValidSolanaAddress = useMemo(() => isSolanaAddress(contractAddress), [contractAddress])

  const getQueryFn = useCallback(
    (chainId: ChainId) => () => {
      if (isValidSolanaAddress && chainId === solanaChainId) {
        return getSolanaTokenMetadata(contractAddress)
      } else if (isValidEvmAddress && isEvmChainId(chainId)) {
        return getEvmTokenMetadata(chainId)
      } else {
        return skipToken
      }
    },
    [
      contractAddress,
      getEvmTokenMetadata,
      getSolanaTokenMetadata,
      isValidEvmAddress,
      isValidSolanaAddress,
    ],
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
