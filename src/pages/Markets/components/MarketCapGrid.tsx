import { useInView } from 'react-intersection-observer'

import { useMarketsQuery } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

export const MarketCapGrid = ({
  selectedChainId,
  showSparkline,
  limit,
  showMarketCap,
}: RowProps & { limit: number; showMarketCap?: boolean }) => {
  const { ref, inView } = useInView()
  const {
    data: marketCapData,
    isLoading: isMarketCapDataLoading,
    isPending: isMarketCapDataPending,
  } = useMarketsQuery({
    enabled: inView,
    orderBy: 'market_cap_desc',
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
