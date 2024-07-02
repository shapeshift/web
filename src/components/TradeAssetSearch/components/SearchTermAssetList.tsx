import { ASSET_NAMESPACE, type ChainId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { TokenMetadataResponse } from 'alchemy-sdk'
import { useEffect, useMemo, useState } from 'react'
import { getAlchemyInstanceByChainId } from 'lib/alchemySdkInstance'
import { isFulfilled, isSome } from 'lib/utils'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import {
  selectAssetsSortedByName,
  selectWalletConnectedChainIds,
} from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

type TokenMetadata = TokenMetadataResponse & {
  chainId: ChainId
  contractAddress: string
}

const getTokenMetadata = async (
  contractAddress: string,
  chainId: ChainId,
): Promise<TokenMetadata | null> => {
  const alchemy = getAlchemyInstanceByChainId(chainId)
  const tokenMetadataResponse = await alchemy.core.getTokenMetadata(contractAddress)
  return { ...tokenMetadataResponse, chainId, contractAddress }
}

export type SearchTermAssetListProps = {
  isLoading: boolean
  activeChainId: ChainId | 'All'
  searchString: string
  allowWalletUnsupportedAssets: boolean | undefined
  onAssetClick: (asset: Asset) => void
}

export const SearchTermAssetList = ({
  isLoading: assetListLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  onAssetClick,
}: SearchTermAssetListProps) => {
  const [customAssets, setCustomAssets] = useState<Asset[]>([])
  const [isSearchingCustomTokens, setIsSearchingCustomTokens] = useState(false)

  const assets = useAppSelector(selectAssetsSortedByName)

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

  const assetsForChain = useMemo(() => {
    if (activeChainId === 'All') {
      if (allowWalletUnsupportedAssets) return assets
      return assets.filter(asset => walletConnectedChainIds.includes(asset.chainId))
    }

    // Should never happen, but paranoia.
    if (!allowWalletUnsupportedAssets && !walletConnectedChainIds.includes(activeChainId)) return []

    return assets.filter(asset => asset.chainId === activeChainId)
  }, [activeChainId, allowWalletUnsupportedAssets, assets, walletConnectedChainIds])

  useEffect(() => {
    const ethChainAdapter = assertGetEvmChainAdapter(ethChainId)
    ;(async () => {
      const isTokenAddress = (await ethChainAdapter.validateAddress(searchString)).valid
      const chainIds = activeChainId === 'All' ? walletConnectedChainIds : [activeChainId]
      if (!isTokenAddress || isSearchingCustomTokens) return

      // For loading state, and to avoid duplicate requests
      setIsSearchingCustomTokens(true)

      const customTokensMetadataPromises = chainIds.map(chainId =>
        getTokenMetadata(searchString, chainId),
      )

      const customTokensMetadataAwaited = await Promise.allSettled(customTokensMetadataPromises)
      const customTokensMetadata = customTokensMetadataAwaited
        .filter(isFulfilled)
        .map(r => r.value)
        .filter(isSome)

      const customTokenAssets: Asset[] = (
        await Promise.all(
          customTokensMetadata?.map(metadata => {
            const { name, symbol, decimals, logo } = metadata
            // If we can't get all the information we need to create an Asset, don't allow the custom token
            if (!name || !symbol || !decimals) return null
            return {
              chainId: metadata.chainId,
              assetId: toAssetId({
                chainId: metadata.chainId,
                assetNamespace: ASSET_NAMESPACE.erc20, // FIXME: make this dynamic based on the ChainId
                assetReference: metadata.contractAddress,
              }),
              name,
              symbol,
              precision: decimals,
              icon: logo ?? '',
              explorer: '', // FIXME
              explorerTxLink: '', // FIXME
              explorerAddressLink: '', // FIXME
              color: '', // FIXME: hexColor,
            }
          }),
        )
      ).filter(isSome)
      setCustomAssets(customTokenAssets)
      setIsSearchingCustomTokens(false)
    })()
  }, [activeChainId, isSearchingCustomTokens, searchString, walletConnectedChainIds])

  const searchTermAssets = useMemo(() => {
    return [...customAssets, ...filterAssetsBySearchTerm(searchString, assetsForChain)]
  }, [assetsForChain, customAssets, searchString])

  const { groups, groupCounts, groupIsLoading } = useMemo(() => {
    return {
      groups: ['modals.assetSearch.customAssets', 'modals.assetSearch.searchResults'],
      groupCounts: [customAssets.length, searchTermAssets.length],
      groupIsLoading: [isSearchingCustomTokens, assetListLoading],
    }
  }, [assetListLoading, customAssets.length, isSearchingCustomTokens, searchTermAssets.length])

  return (
    <GroupedAssetList
      assets={searchTermAssets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={onAssetClick}
    />
  )
}
