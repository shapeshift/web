import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectPortfolioLoading } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useGetPopularAssetsQuery } from '../hooks/useGetPopularAssetsQuery'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

export type DefaultAssetListProps = {
  portfolioAssetsSortedByBalance: Asset[]
  popularAssets: Asset[]
  onAssetClick: (asset: Asset) => void
}

export const DefaultAssetList = ({
  portfolioAssetsSortedByBalance,
  popularAssets,
  onAssetClick,
}: DefaultAssetListProps) => {
  const isPortfolioLoading = useAppSelector(selectPortfolioLoading)
  const { isConnected } = useWallet().state
  const { isLoading: isPopularAssetIdsLoading } = useGetPopularAssetsQuery()

  const groupIsLoading = useMemo(() => {
    return [isConnected && isPortfolioLoading, isPopularAssetIdsLoading]
  }, [isConnected, isPopularAssetIdsLoading, isPortfolioLoading])

  const { allAssets, groups, groupCounts } = useMemo(() => {
    // only show popular assets if user wallet is empty
    if (portfolioAssetsSortedByBalance.length === 0) {
      return {
        groups: ['modals.assetSearch.popularAssets'],
        groupCounts: [popularAssets.length],
        allAssets: popularAssets,
      }
    }

    return {
      groups: ['modals.assetSearch.myAssets', 'modals.assetSearch.popularAssets'],
      groupCounts: [portfolioAssetsSortedByBalance.length, popularAssets.length],
      allAssets: portfolioAssetsSortedByBalance.concat(popularAssets),
    }
  }, [popularAssets, portfolioAssetsSortedByBalance])

  return (
    <GroupedAssetList
      assets={allAssets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={onAssetClick}
    />
  )
}
