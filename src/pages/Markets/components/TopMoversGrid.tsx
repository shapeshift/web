import { useInView } from 'react-intersection-observer'

import { useTopMoversQuery } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

export const TopMoversGrid = ({
  selectedChainId,
  showSparkline,
  limit,
}: RowProps & { limit: number }) => {
  const { ref, inView } = useInView()
  const {
    data: topMoversData,
    isLoading: isTopMoversDataLoading,
    isPending: isTopMoversDataPending,
  } = useTopMoversQuery(inView)
  return (
    <div ref={ref}>
      <AssetsGrid
        assetIds={topMoversData?.ids ?? []}
        selectedChainId={selectedChainId}
        isLoading={isTopMoversDataLoading || isTopMoversDataPending}
        limit={limit}
        showSparkline={showSparkline}
      />
    </div>
  )
}
