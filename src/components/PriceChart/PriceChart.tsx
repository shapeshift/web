import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { calculatePercentChange } from 'lib/charts'
import {
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectPriceHistoryByAssetTimeframe,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type PriceChartArgs = {
  assetId: CAIP19
  timeframe: HistoryTimeframe
  percentChange: number
  setPercentChange: (percentChange: number) => void
}

export const PriceChart: React.FC<PriceChartArgs> = ({
  assetId,
  timeframe,
  percentChange,
  setPercentChange,
}) => {
  const assetIds = useMemo(() => [assetId], [assetId])
  // fetch price history for this asset
  useFetchPriceHistories({ assetIds, timeframe })

  const data = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, assetId, timeframe),
  )

  useEffect(() => setPercentChange(calculatePercentChange(data)), [data, setPercentChange])

  const loading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe),
  )
  const color = percentChange > 0 ? 'green.500' : 'red.500'

  return (
    <Card.Body p={0} height='350px'>
      <Graph color={color} data={data} loading={loading} isLoaded={!loading} />
    </Card.Body>
  )
}
