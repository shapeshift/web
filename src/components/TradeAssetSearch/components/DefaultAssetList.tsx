import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { useGetPopularAssetsQuery } from '../hooks/useGetPopularAssetsQuery'

import { GroupedAssetList } from '@/components/TradeAssetSearch/components/GroupedAssetList/GroupedAssetList'
import type { FiatTypeEnumWithoutCryptos } from '@/constants/fiats'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectIsPortfolioLoading } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type DefaultAssetListProps = {
  portfolioAssetsSortedByBalance: Asset[]
  popularAssets: Asset[]
  onAssetClick: (asset: Asset) => void
  onFiatClick?: (fiat: FiatTypeEnumWithoutCryptos) => void
  activeChainId: ChainId | 'All'
  showFiatAssets?: boolean
}

export const DefaultAssetList = ({
  portfolioAssetsSortedByBalance,
  popularAssets,
  onAssetClick,
  onFiatClick,
  activeChainId,
  showFiatAssets = false,
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

    return {
      groups: ['modals.assetSearch.myAssets', 'modals.assetSearch.popularAssets'],
      groupCounts: [portfolioAssetsSortedByBalance.length, popularAssets.length],
      assets: portfolioAssetsSortedByBalance.concat(popularAssets),
    }
  }, [popularAssets, portfolioAssetsSortedByBalance])

  return (
    <GroupedAssetList
      assets={assets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={onAssetClick}
      onFiatClick={onFiatClick}
      activeChainId={activeChainId}
      showFiatAssets={showFiatAssets}
    />
  )
}
