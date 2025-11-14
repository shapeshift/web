import { useInView } from 'react-intersection-observer'

import type { MarketsCategories } from '../constants'
import { CATEGORY_TO_QUERY_HOOK } from '../hooks/useCoingeckoData'
import type { RowProps } from '../hooks/useRows'
import { AssetsGrid } from './AssetsGrid'

import type { OrderDirection } from '@/components/OrderDropdown/types'
import type { SortOptionsKeys } from '@/components/SortDropdown/types'

export const AssetGridWithData = ({
  selectedChainId,
  showSparkline,
  limit,
  showMarketCap,
  category,
  orderBy,
  sortBy,
}: RowProps & {
  limit: number
  category: Exclude<MarketsCategories, MarketsCategories.OneClickDefi>
  showMarketCap?: boolean
  orderBy?: OrderDirection
  sortBy?: SortOptionsKeys
}) => {
  'use no memo'
  const { ref, inView } = useInView()
  const dataQuery = CATEGORY_TO_QUERY_HOOK[category]

  const {
    data: marketCapData,
    isLoading: isMarketCapDataLoading,
    isPending: isMarketCapDataPending,
  } = dataQuery({
    enabled: inView,
    orderBy,
    sortBy,
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
