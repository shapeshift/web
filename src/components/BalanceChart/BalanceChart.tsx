import { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { calculatePercentChange } from 'lib/charts'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

type BalanceChartArgs = {
  assetIds: AssetId[]
  accountId?: AccountSpecifier
  timeframe: HistoryTimeframe
  percentChange: number
  setPercentChange: (percentChange: number) => void
}

export const BalanceChart: React.FC<BalanceChartArgs> = ({
  assetIds,
  accountId,
  timeframe,
  percentChange,
  setPercentChange,
}) => {
  const { balanceChartData, balanceChartDataLoading } = useBalanceChartData({
    assetIds,
    accountId,
    timeframe,
  })

  const { total, rainbow } = balanceChartData

  useEffect(() => setPercentChange(calculatePercentChange(total)), [total, setPercentChange])

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  return (
    <Card.Body p={0} height='350px'>
      <Graph
        color={color}
        data={rainbow}
        loading={balanceChartDataLoading}
        isLoaded={!balanceChartDataLoading}
        rainbow={true}
      />
    </Card.Body>
  )
}
