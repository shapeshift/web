import type { ChainId } from '@shapeshiftoss/caip'
import { PORTALS_SUPPORTED_CHAIN_IDS } from '@shapeshiftoss/swapper/dist/swappers/PortalsSwapper/constants'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { OrderOptionsKeys } from 'components/OrderDropdown/types'
import { SortOptionsKeys } from 'components/SortDropdown/types'
import { getCoingeckoSupportedChainIds } from 'lib/coingecko/utils'
import { SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

import { AssetGridWithData } from '../components/AssetGridWithData'
import { OneClickDefiAssets, ThorchainAssets } from '../components/LpGrid'
import { MARKETS_CATEGORIES } from '../constants'

export type RowProps = {
  selectedChainId: ChainId | undefined
  showSparkline?: boolean
  sortBy?: SortOptionsKeys
  orderBy?: OrderOptionsKeys
}

export const useRows = ({ limit }: { limit: number }) => {
  const translate = useTranslate()

  const coingeckoSupportedChainIds = useMemo(() => getCoingeckoSupportedChainIds(), [])

  const MARKETS_CATEGORY_TO_ROW: Record<
    MARKETS_CATEGORIES,
    {
      category: MARKETS_CATEGORIES
      title: string
      subtitle?: string
      component: (props: RowProps) => JSX.Element
      supportedChainIds?: ChainId[] | undefined
    }
  > = useMemo(
    () => ({
      [MARKETS_CATEGORIES.TRADING_VOLUME]: {
        category: MARKETS_CATEGORIES.TRADING_VOLUME,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TRADING_VOLUME}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TRADING_VOLUME}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, sortBy, orderBy }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.TRADING_VOLUME}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy ?? OrderOptionsKeys.DESCENDING}
            sortBy={sortBy ?? SortOptionsKeys.VOLUME}
          />
        ),
      },
      [MARKETS_CATEGORIES.MARKET_CAP]: {
        category: MARKETS_CATEGORIES.MARKET_CAP,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.MARKET_CAP}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.MARKET_CAP}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.MARKET_CAP}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            showMarketCap
            orderBy={orderBy ?? OrderOptionsKeys.DESCENDING}
            sortBy={sortBy ?? SortOptionsKeys.MARKET_CAP}
          />
        ),
      },
      [MARKETS_CATEGORIES.TRENDING]: {
        category: MARKETS_CATEGORIES.TRENDING,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TRENDING}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TRENDING}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.TRENDING}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
      },
      [MARKETS_CATEGORIES.TOP_MOVERS]: {
        category: MARKETS_CATEGORIES.TOP_MOVERS,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TOP_MOVERS}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TOP_MOVERS}.subtitle`, {
          percentage: '10',
        }),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.TOP_MOVERS}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
      },
      [MARKETS_CATEGORIES.RECENTLY_ADDED]: {
        category: MARKETS_CATEGORIES.RECENTLY_ADDED,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.RECENTLY_ADDED}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.RECENTLY_ADDED}.subtitle`),
        supportedChainIds: coingeckoSupportedChainIds,
        component: ({ selectedChainId, showSparkline, orderBy, sortBy }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.RECENTLY_ADDED}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy={orderBy}
            sortBy={sortBy}
          />
        ),
      },
      [MARKETS_CATEGORIES.ONE_CLICK_DEFI]: {
        category: MARKETS_CATEGORIES.ONE_CLICK_DEFI,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.ONE_CLICK_DEFI}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.ONE_CLICK_DEFI}.subtitle`),
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
      [MARKETS_CATEGORIES.THORCHAIN_DEFI]: {
        category: MARKETS_CATEGORIES.THORCHAIN_DEFI,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.THORCHAIN_DEFI}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.THORCHAIN_DEFI}.subtitle`),
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
