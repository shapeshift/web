import { ASSET_NAMESPACE, type ChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { isSome } from 'lib/utils'
import {
  selectAssetsSortedByName,
  selectWalletConnectedChainIds,
} from 'state/slices/common-selectors'
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
}

export const SearchTermAssetList = ({
  isLoading: assetListLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  onAssetClick,
}: SearchTermAssetListProps) => {
  const assets = useAppSelector(selectAssetsSortedByName)
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const chainIds = activeChainId === 'All' ? walletConnectedChainIds : [activeChainId]
  const { data: customTokens, isLoading: isLoadingCustomTokens } = useGetCustomTokensQuery({
    contractAddress: searchString,
    chainIds,
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
        .map(metaData => metaData.data)
        .filter(isSome)
        .map(metaData => {
          const { name, symbol, decimals, logo } = metaData
          // If we can't get all the information we need to create an Asset, don't allow the custom token
          if (!name || !symbol || !decimals) return null
          return {
            chainId: metaData.chainId,
            assetId: toAssetId({
              chainId: metaData.chainId,
              assetNamespace: ASSET_NAMESPACE.erc20, // FIXME: make this dynamic based on the ChainId
              assetReference: metaData.contractAddress,
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
        })
        .filter(isSome),
    [customTokens],
  )

  const searchTermAssets = useMemo(() => {
    return [...customAssets, ...filterAssetsBySearchTerm(searchString, assetsForChain)]
  }, [assetsForChain, customAssets, searchString])

  const { groups, groupCounts, groupIsLoading } = useMemo(() => {
    return {
      groups: ['modals.assetSearch.customAssets', 'modals.assetSearch.searchResults'],
      groupCounts: [customAssets.length, searchTermAssets.length],
      groupIsLoading: [isLoadingCustomTokens, assetListLoading],
    }
  }, [assetListLoading, customAssets.length, isLoadingCustomTokens, searchTermAssets.length])

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
