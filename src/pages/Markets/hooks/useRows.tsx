import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

import { AssetsGrid } from '../components/AssetsGrid'
import { OneClickDefiAssets, ThorchainAssets } from '../components/LpGrid'
import { MARKETS_CATEGORIES } from '../constants'
import {
  useMarketsQuery,
  useRecentlyAddedQuery,
  useTopMoversQuery,
  useTrendingQuery,
} from '../hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '../hooks/usePortalsAssetsQuery'

export const useRows = ({ limit }: { limit: number }) => {
  const translate = useTranslate()

  const { data: topMoversData, isLoading: isTopMoversDataLoading } = useTopMoversQuery()
  const { data: trendingData, isLoading: isTrendingDataLoading } = useTrendingQuery()
  const { data: recentlyAddedData, isLoading: isRecentlyAddedDataLoading } = useRecentlyAddedQuery()
  const { data: highestVolumeData, isLoading: isHighestVolumeDataLoading } = useMarketsQuery({
    orderBy: 'volume_desc',
  })
  const { data: marketCapData, isLoading: isMarketCapDataLoading } = useMarketsQuery({
    orderBy: 'market_cap_desc',
  })

  // Fetch for all chains here so we know which chains to show in the dropdown
  const { data: allPortalsAssets } = usePortalsAssetsQuery({
    chainIds: undefined,
  })

  const MARKETS_CATEGORY_TO_ROW: Record<
    MARKETS_CATEGORIES,
    {
      category: MARKETS_CATEGORIES
      title: string
      subtitle?: string
      component: (selectedChainId: ChainId | undefined) => JSX.Element
      supportedChainIds?: ChainId[] | undefined
    }
  > = useMemo(
    () => ({
      [MARKETS_CATEGORIES.TRADING_VOLUME]: {
        category: MARKETS_CATEGORIES.TRADING_VOLUME,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TRADING_VOLUME}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TRADING_VOLUME}.subtitle`),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={highestVolumeData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isHighestVolumeDataLoading}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.MARKET_CAP]: {
        category: MARKETS_CATEGORIES.MARKET_CAP,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.MARKET_CAP}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.MARKET_CAP}.subtitle`),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={marketCapData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isMarketCapDataLoading}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.TRENDING]: {
        category: MARKETS_CATEGORIES.TRENDING,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TRENDING}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TRENDING}.subtitle`, {
          percentage: '10',
        }),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={trendingData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isTrendingDataLoading}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.TOP_MOVERS]: {
        category: MARKETS_CATEGORIES.TOP_MOVERS,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TOP_MOVERS}.title`),
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={topMoversData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isTopMoversDataLoading}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.RECENTLY_ADDED]: {
        category: MARKETS_CATEGORIES.RECENTLY_ADDED,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.RECENTLY_ADDED}.title`),
        // TODO(gomes): loading state when implemented
        component: (selectedChainId: ChainId | undefined) => (
          <AssetsGrid
            assetIds={recentlyAddedData?.ids ?? []}
            selectedChainId={selectedChainId}
            isLoading={isRecentlyAddedDataLoading}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.ONE_CLICK_DEFI]: {
        category: MARKETS_CATEGORIES.ONE_CLICK_DEFI,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.ONE_CLICK_DEFI}.title`),
        component: (selectedChainId: ChainId | undefined) => (
          <OneClickDefiAssets selectedChainId={selectedChainId} limit={limit} />
        ),
        supportedChainIds: allPortalsAssets?.chainIds,
      },
      [MARKETS_CATEGORIES.THORCHAIN_DEFI]: {
        category: MARKETS_CATEGORIES.THORCHAIN_DEFI,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.THORCHAIN_DEFI}.title`),
        component: (selectedChainId: ChainId | undefined) => (
          <ThorchainAssets selectedChainId={selectedChainId} limit={limit} />
        ),
        supportedChainIds: SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS,
      },
    }),
    [
      allPortalsAssets?.chainIds,
      highestVolumeData?.ids,
      isHighestVolumeDataLoading,
      isMarketCapDataLoading,
      isRecentlyAddedDataLoading,
      isTopMoversDataLoading,
      isTrendingDataLoading,
      limit,
      marketCapData?.ids,
      recentlyAddedData?.ids,
      topMoversData?.ids,
      translate,
      trendingData?.ids,
    ],
  )

  return MARKETS_CATEGORY_TO_ROW
}
