import { Box } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'

import { Graph } from '@/components/Graph/Graph'
import { useBalanceChartData } from '@/hooks/useBalanceChartData/useBalanceChartData'
import { calculatePercentChange } from '@/lib/charts'

const chartHeight = { base: '250px', md: '350px' }

type BalanceChartArgs = {
  assetId?: AssetId
  accountId?: AccountId
  timeframe: HistoryTimeframe
  percentChange: number
  setPercentChange: (percentChange: number) => void
  isRainbowChart: boolean
}

const balanceChartSkeletonData = {
  total: [],
  rainbow: [],
}

export const BalanceChart: React.FC<BalanceChartArgs> = ({
  assetId,
  accountId,
  timeframe,
  percentChange,
  setPercentChange,
  isRainbowChart,
}) => {
  console.log('[BalanceChart] Rendering - assetId:', assetId, 'accountId:', accountId)
  const { balanceChartData, balanceChartDataLoading } = useBalanceChartData(
    timeframe,
    assetId,
    accountId,
  )

  const { total } = balanceChartData

  useEffect(() => setPercentChange(calculatePercentChange(total)), [total, setPercentChange])

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  return (
    <Box height={chartHeight}>
      <Graph
        color={color}
        data={balanceChartData}
        isLoading={balanceChartDataLoading}
        isRainbowChart={isRainbowChart}
      />
    </Box>
  )
}

export const BalanceChartSkeleton: React.FC<BalanceChartArgs> = ({
  percentChange,
  isRainbowChart,
}) => {
  const color = percentChange > 0 ? 'green.500' : 'red.500'

  return (
    <Box height={chartHeight}>
      <Graph
        color={color}
        data={balanceChartSkeletonData}
        isLoading
        isRainbowChart={isRainbowChart}
      />
    </Box>
  )
}
