import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { selectAssetsSortedByName } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

export type SearchTermAssetListProps = {
  isLoading: boolean
  activeChainId: ChainId | 'All'
  searchString: string
  onAssetClick: (asset: Asset) => void
}

export const SearchTermAssetList = ({
  isLoading,
  activeChainId,
  searchString,
  onAssetClick,
}: SearchTermAssetListProps) => {
  const assets = useAppSelector(selectAssetsSortedByName)
  const groupIsLoading = useMemo(() => {
    return [Boolean(isLoading)]
  }, [isLoading])

  const assetsForChain = useMemo(() => {
    if (activeChainId === 'All') return assets
    return assets.filter(asset => asset.chainId === activeChainId)
  }, [activeChainId, assets])

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
