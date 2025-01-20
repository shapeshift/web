import { Metaplex } from '@metaplex-foundation/js'
import type { ChainId } from '@shapeshiftoss/caip'
import { solanaChainId } from '@shapeshiftoss/caip'
import { Connection, PublicKey } from '@solana/web3.js'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import type { TokenMetadataResponse } from 'alchemy-sdk'
import { getConfig } from 'config'
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

type SolanaUriJson = {
  name: string
  symbol: string
  description: string
  image: string
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
      const solanaRpcUrl = `https://solana-mainnet.g.alchemy.com/v2/${
        getConfig().REACT_APP_ALCHEMY_API_KEY
      }`
      const connection = new Connection(solanaRpcUrl)
      const metaplex = Metaplex.make(connection)
      const metadata = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) })
      const uri = metadata.uri
      let uriJson: SolanaUriJson | null = null
      try {
        const uriResponse = await fetch(uri)
        uriJson = await uriResponse.json()
      } catch (error) {
        console.error('Error fetching Solana token metadata', error)
      }

      return {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.mint.currency.decimals,
        chainId: solanaChainId,
        contractAddress: mintAddress,
        price: '0',
        logo: uriJson?.image ?? '',
      }
    },
    [],
  )

  const isValidEvmAddress = useMemo(
    () => isAddress(contractAddress, { strict: false }),
    [contractAddress],
  )

  const isValidSolanaAddress = useMemo(() => {
    try {
      const publicKey = new PublicKey(contractAddress)
      return publicKey !== null
    } catch (error) {
      // If instantiation fails, it's not a valid Solana address
      return false
    }
  }, [contractAddress])

  const getQueryFn = useCallback(
    (chainId: ChainId) => () => {
      if (chainId === solanaChainId) {
        return getSolanaTokenMetadata(contractAddress)
      } else {
        return getEvmTokenMetadata(chainId)
      }
    },
    [contractAddress, getEvmTokenMetadata, getSolanaTokenMetadata],
  )

  const customTokenQueries = useQueries({
    queries:
      isValidEvmAddress || isValidSolanaAddress
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
