import { useInView } from 'react-intersection-observer'

import { useTrendingQuery } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

export const TrendingGrid = ({
  selectedChainId,
  showSparkline,
  limit,
}: RowProps & { limit: number }) => {
  const { ref, inView } = useInView()
  const {
    data: trendingData,
    isLoading: isTrendingDataLoading,
    isPending: isTrendingDataPending,
  } = useTrendingQuery(inView)
  return (
    <div ref={ref}>
      <AssetsGrid
        assetIds={trendingData?.ids ?? []}
        selectedChainId={selectedChainId}
        isLoading={isTrendingDataLoading || isTrendingDataPending}
        limit={limit}
        showSparkline={showSparkline}
      />
    </div>
  )
}
