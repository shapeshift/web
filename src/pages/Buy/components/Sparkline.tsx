import { Box, Center, useToken } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { curveNatural } from '@visx/curve'
import { LineSeries, XYChart } from '@visx/xychart'
import { useMemo } from 'react'
import {
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectPriceHistoryByAssetTimeframe,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type SparkLineProps = {
  assetId: AssetId
  percentChange?: number
  themeColor?: string
  height?: number
}

const xyChartMargin = { top: 4, left: 0, right: 0, bottom: 4 }
const xyChartxScale = { type: 'utc' } as const
const xyChartYScale = { type: 'log' } as const

export const SparkLine: React.FC<SparkLineProps> = ({
  assetId,
  percentChange,
  themeColor = 'blue',
  height = 50,
}) => {
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
      xAccessor: (d: HistoryData | undefined) => d?.date,
      yAccessor: (d: HistoryData | undefined) => d?.price,
    }
  }, [])

  const color = useMemo(() => {
    if (themeColor) return themeColor
    if (percentChange) return percentChange > 0 ? 'green.500' : 'red.500'
    return 'gray.500'
  }, [percentChange, themeColor])

  const [chartColor] = useToken('colors', [color])

  return (
    <Box>
      {loading ? (
        <Center width={100} height={height} />
      ) : (
        <XYChart
          margin={xyChartMargin}
          width={100}
          height={height}
          xScale={xyChartxScale}
          yScale={xyChartYScale}
        >
          <LineSeries
            dataKey={`${assetId}-series`}
            data={priceData}
            stroke={chartColor}
            strokeWidth={2}
            curve={curveNatural}
            {...accessors}
          />
        </XYChart>
      )}
    </Box>
  )
}
