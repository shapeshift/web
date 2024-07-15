import { ASSET_NAMESPACE, bscChainId, type ChainId, toAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { makeAsset, type MinimalAsset } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { ALCHEMY_SUPPORTED_CHAIN_IDS } from 'lib/alchemySdkInstance'
import { isSome } from 'lib/utils'
import {
  selectAssetsSortedByName,
  selectWalletConnectedChainIds,
} from 'state/slices/common-selectors'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { useGetCustomTokensQuery } from '../hooks/useGetCustomTokensQuery'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

export type SearchTermAssetListProps = {
  isLoading: boolean
  activeChainId: ChainId | 'All'
  searchString: string
  allowWalletUnsupportedAssets: boolean | undefined
  onAssetClick: (asset: Asset) => void
  onImportClick: (asset: Asset) => void
}

export const SearchTermAssetList = ({
  isLoading: isAssetListLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  onAssetClick,
  onImportClick,
}: SearchTermAssetListProps) => {
  const assets = useAppSelector(selectAssetsSortedByName)
  const assetsById = useAppSelector(selectAssets)
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const chainIds = useMemo(
    () => (activeChainId === 'All' ? walletConnectedChainIds : [activeChainId]),
    [activeChainId, walletConnectedChainIds],
  )
  const walletSupportedEvmChainIds = useMemo(() => chainIds.filter(isEvmChainId), [chainIds])
  const alchemySupportedChainIds = useMemo(
    () =>
      walletSupportedEvmChainIds.filter(chainId => ALCHEMY_SUPPORTED_CHAIN_IDS.includes(chainId)),
    [walletSupportedEvmChainIds],
  )
  const { data: customTokens, isLoading: isLoadingCustomTokens } = useGetCustomTokensQuery({
    contractAddress: searchString,
    chainIds: alchemySupportedChainIds,
  })

  const assetsForChain = useMemo(() => {
    if (activeChainId === 'All') {
      if (allowWalletUnsupportedAssets) return assets
      return assets.filter(asset => walletConnectedChainIds.includes(asset.chainId))
    }

    // Should never happen, but paranoia.
    if (!allowWalletUnsupportedAssets && !walletConnectedChainIds.includes(activeChainId)) return []

    return assets.filter(asset => asset.chainId === activeChainId)
  }, [activeChainId, allowWalletUnsupportedAssets, assets, walletConnectedChainIds])

  const customAssets: Asset[] = useMemo(
    () =>
      customTokens
        ? customTokens
            .filter(isSome)
            .map(metaData => {
              const { name, symbol, decimals, logo } = metaData
              // If we can't get all the information we need to create an Asset, don't allow the custom token
              if (!name || !symbol || !decimals) return null
              const assetId = toAssetId({
                chainId: metaData.chainId,
                assetNamespace:
                  metaData.chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
                assetReference: metaData.contractAddress,
              })
              const minimalAsset: MinimalAsset = {
                assetId,
                name,
                symbol,
                precision: decimals,
                icon: logo ?? undefined,
              }
              return makeAsset(assetsById, minimalAsset, true)
            })
            .filter(isSome)
        : [],
    [assetsById, customTokens],
  )

  // We only want to show custom assets that aren't already in the asset list
  const searchTermAssets = useMemo(() => {
    const filteredAssets = filterAssetsBySearchTerm(searchString, assetsForChain)
    const existingAssetIds = new Set(filteredAssets.map(asset => asset.assetId))
    const uniqueCustomAssets = customAssets.filter(asset => !existingAssetIds.has(asset.assetId))

    return filteredAssets.concat(uniqueCustomAssets)
  }, [assetsForChain, customAssets, searchString])

  const { groups, groupCounts, groupIsLoading } = useMemo(() => {
    return {
      groups: ['modals.assetSearch.searchResults'],
      groupCounts: [searchTermAssets.length],
      groupIsLoading: [isLoadingCustomTokens || isAssetListLoading],
    }
  }, [isAssetListLoading, isLoadingCustomTokens, searchTermAssets.length])

  return (
    <GroupedAssetList
      assets={searchTermAssets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={onAssetClick}
      onImportClick={onImportClick}
    />
  )
}
