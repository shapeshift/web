import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { useGetPopularAssetsQuery } from '../hooks/useGetPopularAssetsQuery'

import { GroupedAssetList } from '@/components/TradeAssetSearch/components/GroupedAssetList/GroupedAssetList'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectIsPortfolioLoading } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type DefaultAssetListProps = {
  portfolioAssetsSortedByBalance: Asset[]
  popularAssets: Asset[]
  onAssetClick: (asset: Asset) => void
  activeChainId: ChainId | 'All'
  assetFilterPredicate?: (assetId: AssetId) => boolean
  chainIdFilterPredicate?: (chainId: ChainId) => boolean
}

export const DefaultAssetList = ({
  portfolioAssetsSortedByBalance,
  popularAssets,
  onAssetClick,
  activeChainId,
  assetFilterPredicate,
  chainIdFilterPredicate,
}: DefaultAssetListProps) => {
  const { isConnected } = useWallet().state
  const isPortfolioLoading = useAppSelector(selectIsPortfolioLoading)
  const { isLoading: isPopularAssetIdsLoading } = useGetPopularAssetsQuery()

  const groupIsLoading = useMemo(() => {
    return [isConnected && isPortfolioLoading, isPopularAssetIdsLoading]
  }, [isConnected, isPopularAssetIdsLoading, isPortfolioLoading])

  const { assets, groups, groupCounts } = useMemo(() => {
    // only show popular assets if user wallet is empty
    if (portfolioAssetsSortedByBalance.length === 0) {
      return {
        groups: ['modals.assetSearch.popularAssets'],
        groupCounts: [popularAssets.length],
        assets: popularAssets,
      }
    }

    // Every popular asset is already held, so there's nothing left to list under Popular Assets
    if (popularAssets.length === 0 && !isPopularAssetIdsLoading) {
      return {
        groups: ['modals.assetSearch.myAssets'],
        groupCounts: [portfolioAssetsSortedByBalance.length],
        assets: portfolioAssetsSortedByBalance,
      }
    }

    return {
      groups: ['modals.assetSearch.myAssets', 'modals.assetSearch.popularAssets'],
      groupCounts: [portfolioAssetsSortedByBalance.length, popularAssets.length],
      assets: portfolioAssetsSortedByBalance.concat(popularAssets),
    }
  }, [isPopularAssetIdsLoading, popularAssets, portfolioAssetsSortedByBalance])

  return (
    <GroupedAssetList
      assets={assets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={onAssetClick}
      activeChainId={activeChainId}
      assetFilterPredicate={assetFilterPredicate}
      chainIdFilterPredicate={chainIdFilterPredicate}
    />
  )
}
