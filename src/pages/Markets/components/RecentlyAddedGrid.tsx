import { useInView } from 'react-intersection-observer'

import { useRecentlyAddedQuery } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

export const RecentlyAddedGrid = ({
  selectedChainId,
  showSparkline,
  limit,
}: RowProps & { limit: number }) => {
  const { ref, inView } = useInView()
  const {
    data: recentlyAddedData,
    isLoading: isRecentlyAddedDataLoading,
    isPending: isRecentlyAddedDataPending,
  } = useRecentlyAddedQuery(inView)
  return (
    <div ref={ref}>
      <AssetsGrid
        assetIds={recentlyAddedData?.ids ?? []}
        selectedChainId={selectedChainId}
        isLoading={isRecentlyAddedDataLoading || isRecentlyAddedDataPending}
        limit={limit}
        showSparkline={showSparkline}
      />
    </div>
  )
}
