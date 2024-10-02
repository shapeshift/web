import { useInView } from 'react-intersection-observer'

import { useMarketsQuery } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

export const TradingVolumeGrid = ({
  selectedChainId,
  showSparkline,
  limit,
}: RowProps & { limit: number }) => {
  const { ref, inView } = useInView()
  const {
    data: highestVolumeData,
    isLoading: isHighestVolumeDataLoading,
    isPending: isHighestVolumeDataPending,
  } = useMarketsQuery({
    enabled: inView,
    orderBy: 'volume_desc',
  })
  return (
    <div ref={ref}>
      <AssetsGrid
        assetIds={highestVolumeData?.ids ?? []}
        selectedChainId={selectedChainId}
        isLoading={isHighestVolumeDataLoading || isHighestVolumeDataPending}
        limit={limit}
        showSparkline={showSparkline}
      />
    </div>
  )
}
