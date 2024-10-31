import type { ChainId } from '@shapeshiftoss/caip'
import { PORTALS_SUPPORTED_CHAIN_IDS } from '@shapeshiftoss/swapper/dist/swappers/PortalsSwapper/constants'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { OrderDirection } from 'components/OrderDropdown/types'
import { SortOptionsKeys } from 'components/SortDropdown/types'
import { getCoingeckoSupportedChainIds } from 'lib/coingecko/utils'
import { SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

import { AssetGridWithData } from '../components/AssetGridWithData'
import { OneClickDefiAssets, ThorchainAssets } from '../components/LpGrid'
import { MarketsCategories } from '../constants'

export type RowProps = {
  selectedChainId: ChainId | undefined
  showSparkline?: boolean
  sortBy?: SortOptionsKeys
  orderBy?: OrderDirection
}

export const useRows = ({ limit }: { limit: number }) => {
  const translate = useTranslate()

  const coingeckoSupportedChainIds = useMemo(() => getCoingeckoSupportedChainIds(), [])

  const MARKETS_CATEGORY_TO_ROW: Record<
    MarketsCategories,
    {
      category: MarketsCategories
      title: string
      subtitle?: string
      component: (props: RowProps) => JSX.Element
      supportedChainIds?: ChainId[] | undefined
    }
  > = useMemo(
    () => ({
      [MarketsCategories.TradingVolume]: {
        category: MarketsCategories.TradingVolume,
        title: translate(`markets.categories.${MarketsCategories.TradingVolume}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.TradingVolume}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, sortBy, orderBy }: RowProps) => (
          <AssetGridWithData
            category={MarketsCategories.TradingVolume}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy ?? OrderDirection.Descending}
            sortBy={sortBy ?? SortOptionsKeys.Volume}
          />
        ),
      },
      [MarketsCategories.MarketCap]: {
        category: MarketsCategories.MarketCap,
        title: translate(`markets.categories.${MarketsCategories.MarketCap}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.MarketCap}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MarketsCategories.MarketCap}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            showMarketCap
            orderBy={orderBy ?? OrderDirection.Descending}
            sortBy={sortBy ?? SortOptionsKeys.MarketCap}
          />
        ),
      },
      [MarketsCategories.Trending]: {
        category: MarketsCategories.Trending,
        title: translate(`markets.categories.${MarketsCategories.Trending}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.Trending}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MarketsCategories.Trending}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
      },
      [MarketsCategories.TopMovers]: {
        category: MarketsCategories.TopMovers,
        title: translate(`markets.categories.${MarketsCategories.TopMovers}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.TopMovers}.subtitle`, {
          percentage: '10',
        }),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MarketsCategories.TopMovers}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
      },
      [MarketsCategories.RecentlyAdded]: {
        category: MarketsCategories.RecentlyAdded,
        title: translate(`markets.categories.${MarketsCategories.RecentlyAdded}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.RecentlyAdded}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MarketsCategories.RecentlyAdded}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
      },
      [MarketsCategories.OneClickDefi]: {
        category: MarketsCategories.OneClickDefi,
        title: translate(`markets.categories.${MarketsCategories.OneClickDefi}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.OneClickDefi}.subtitle`),
        component: ({ selectedChainId, orderBy, sortBy }: RowProps) => (
          <OneClickDefiAssets
            selectedChainId={selectedChainId}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
        supportedChainIds: PORTALS_SUPPORTED_CHAIN_IDS.buy,
      },
      [MarketsCategories.ThorchainDefi]: {
        category: MarketsCategories.ThorchainDefi,
        title: translate(`markets.categories.${MarketsCategories.ThorchainDefi}.title`),
        subtitle: translate(`markets.categories.${MarketsCategories.ThorchainDefi}.subtitle`),
        component: ({ selectedChainId, orderBy, sortBy }: RowProps) => (
          <ThorchainAssets
            selectedChainId={selectedChainId}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),

        supportedChainIds: SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS,
      },
    }),
    [coingeckoSupportedChainIds, limit, translate],
  )

  return MARKETS_CATEGORY_TO_ROW
}
