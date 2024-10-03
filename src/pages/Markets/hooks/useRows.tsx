import type { ChainId } from '@shapeshiftoss/caip'
import { PORTALS_SUPPORTED_CHAIN_IDS } from '@shapeshiftoss/swapper/dist/swappers/PortalsSwapper/constants'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

import { AssetGridWithData } from '../components/AssetGridWithData'
import { OneClickDefiAssets, ThorchainAssets } from '../components/LpGrid'
import { MARKETS_CATEGORIES } from '../constants'

export type RowProps = {
  selectedChainId: ChainId | undefined
  showSparkline?: boolean
}

export const useRows = ({ limit }: { limit: number }) => {
  const translate = useTranslate()

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
        component: ({ selectedChainId, showSparkline }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.TRADING_VOLUME}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            orderBy='volume_desc'
          />
        ),
      },
      [MARKETS_CATEGORIES.MARKET_CAP]: {
        category: MARKETS_CATEGORIES.MARKET_CAP,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.MARKET_CAP}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.MARKET_CAP}.subtitle`),
        component: ({ selectedChainId, showSparkline }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.MARKET_CAP}
            orderBy='market_cap_desc'
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
            showMarketCap
          />
        ),
      },
      [MARKETS_CATEGORIES.TRENDING]: {
        category: MARKETS_CATEGORIES.TRENDING,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TRENDING}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TRENDING}.subtitle`),
        component: ({ selectedChainId, showSparkline }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.TRENDING}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.TOP_MOVERS]: {
        category: MARKETS_CATEGORIES.TOP_MOVERS,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.TOP_MOVERS}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.TOP_MOVERS}.subtitle`, {
          percentage: '10',
        }),
        component: ({ selectedChainId, showSparkline }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.TOP_MOVERS}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.RECENTLY_ADDED]: {
        category: MARKETS_CATEGORIES.RECENTLY_ADDED,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.RECENTLY_ADDED}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.RECENTLY_ADDED}.subtitle`),
        component: ({ selectedChainId, showSparkline }: RowProps) => (
          <AssetGridWithData
            category={MARKETS_CATEGORIES.RECENTLY_ADDED}
            selectedChainId={selectedChainId}
            showSparkline={showSparkline}
            limit={limit}
          />
        ),
      },
      [MARKETS_CATEGORIES.ONE_CLICK_DEFI]: {
        category: MARKETS_CATEGORIES.ONE_CLICK_DEFI,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.ONE_CLICK_DEFI}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.ONE_CLICK_DEFI}.subtitle`),
        component: ({ selectedChainId }: RowProps) => (
          <OneClickDefiAssets selectedChainId={selectedChainId} limit={limit} />
        ),
        supportedChainIds: PORTALS_SUPPORTED_CHAIN_IDS.buy,
      },
      [MARKETS_CATEGORIES.THORCHAIN_DEFI]: {
        category: MARKETS_CATEGORIES.THORCHAIN_DEFI,
        title: translate(`markets.categories.${MARKETS_CATEGORIES.THORCHAIN_DEFI}.title`),
        subtitle: translate(`markets.categories.${MARKETS_CATEGORIES.THORCHAIN_DEFI}.subtitle`),
        component: ({ selectedChainId }: RowProps) => (
          <ThorchainAssets selectedChainId={selectedChainId} limit={limit} />
        ),
        supportedChainIds: SUPPORTED_THORCHAIN_SAVERS_CHAIN_IDS,
      },
    }),
    [limit, translate],
  )

  return MARKETS_CATEGORY_TO_ROW
}
