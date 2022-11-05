import { Box } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import type { HistoryTimeframe } from '@keepkey/types'
import { useEffect } from 'react'
import { Graph } from 'components/Graph/Graph'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { calculatePercentChange } from 'lib/charts'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

type BalanceChartArgs = {
  assetIds: AssetId[]
  accountId?: AccountSpecifier
  timeframe: HistoryTimeframe
  percentChange: number
  setPercentChange: (percentChange: number) => void
  isRainbowChart: boolean
}

export const BalanceChart: React.FC<BalanceChartArgs> = ({
  assetIds,
  accountId,
  timeframe,
  percentChange,
  setPercentChange,
  isRainbowChart,
}) => {
  const { balanceChartData, balanceChartDataLoading } = useBalanceChartData({
    assetIds,
    accountId,
    timeframe,
  })

  const { total } = balanceChartData

  useEffect(() => setPercentChange(calculatePercentChange(total)), [total, setPercentChange])

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  return (
    <Box height='350px'>
      <Graph
        color={color}
        data={balanceChartData}
        loading={balanceChartDataLoading}
        isLoaded={!balanceChartDataLoading}
        isRainbowChart={isRainbowChart}
      />
    </Box>
  )
}
