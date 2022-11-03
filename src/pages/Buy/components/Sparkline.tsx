import { Box, Center, Spinner, useToken } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { curveLinear } from '@visx/curve'
import { LineSeries, XYChart } from '@visx/xychart'
import { useMemo } from 'react'
import {
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectPriceHistoryByAssetTimeframe,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type SparkLineProps = {
  assetId: AssetId
  percentChange: number
}

export const SparkLine: React.FC<SparkLineProps> = ({ assetId, percentChange }) => {
  const assetIds = useMemo(() => [assetId], [assetId])
  const timeframe = HistoryTimeframe.DAY

  const priceData = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, assetId, timeframe),
  )

  const loading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe),
  )

  const accessors = useMemo(() => {
    return {
      xAccessor: (d: HistoryData) => d.date,
      yAccessor: (d: HistoryData) => d.price,
    }
  }, [])

  const color = percentChange > 0 ? 'green.500' : 'red.500'
  const [chartColor] = useToken('colors', [color])

  return (
    <Box>
      {loading ? (
        <Center width={100} height={50}>
          <Spinner size='xs' />
        </Center>
      ) : (
        <XYChart
          margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
          width={100}
          height={50}
          xScale={{ type: 'utc' }}
          yScale={{ type: 'log' }}
        >
          <LineSeries
            dataKey={`${assetId}-series`}
            data={priceData}
            stroke={chartColor}
            curve={curveLinear}
            {...accessors}
          />
        </XYChart>
      )}
    </Box>
  )
}
