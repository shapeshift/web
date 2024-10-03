import { useInView } from 'react-intersection-observer'

import type { MARKETS_CATEGORIES } from '../constants'
import { CATEGORY_TO_QUERY_HOOK } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

export const AssetGridWithData = ({
  selectedChainId,
  showSparkline,
  limit,
  showMarketCap,
  category,
  orderBy,
}: RowProps & {
  limit: number
  category: Exclude<
    MARKETS_CATEGORIES,
    MARKETS_CATEGORIES.ONE_CLICK_DEFI | MARKETS_CATEGORIES.THORCHAIN_DEFI
  >
  showMarketCap?: boolean
  orderBy?: 'market_cap_desc' | 'volume_desc'
}) => {
  const { ref, inView } = useInView()
  const dataQuery = CATEGORY_TO_QUERY_HOOK[category]

  const {
    data: marketCapData,
    isLoading: isMarketCapDataLoading,
    isPending: isMarketCapDataPending,
  } = dataQuery({
    enabled: inView,
    // ts isn't smart enough to narrow this down, and we don't want to pass it for all categories where this does not apply
    orderBy: orderBy!,
  })

  return (
    <div ref={ref}>
      <AssetsGrid
        assetIds={marketCapData?.ids ?? []}
        selectedChainId={selectedChainId}
        isLoading={isMarketCapDataLoading || isMarketCapDataPending}
        limit={limit}
        showSparkline={showSparkline}
        showMarketCap={showMarketCap}
      />
    </div>
  )
}
