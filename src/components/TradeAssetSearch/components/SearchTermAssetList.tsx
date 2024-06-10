import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import {
  selectAssetsSortedByName,
  selectWalletConnectedChainIds,
} from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

export type SearchTermAssetListProps = {
  isLoading: boolean
  activeChainId: ChainId | 'All'
  searchString: string
  allowWalletUnsupportedAssets: boolean | undefined
  onAssetClick: (asset: Asset) => void
}

export const SearchTermAssetList = ({
  isLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  onAssetClick,
}: SearchTermAssetListProps) => {
  const assets = useAppSelector(selectAssetsSortedByName)
  const groupIsLoading = useMemo(() => {
    return [Boolean(isLoading)]
  }, [isLoading])

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

  const searchTermAssets = useMemo(() => {
    return filterAssetsBySearchTerm(searchString, assetsForChain)
  }, [searchString, assetsForChain])

  const { groups, groupCounts } = useMemo(() => {
    return {
      groups: ['modals.assetSearch.searchResults'],
      groupCounts: [searchTermAssets.length],
    }
  }, [searchTermAssets.length])

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
