import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { usePortfolioAssets } from 'hooks/usePortfolioAssets/usePortfolioAssets'

export const BalanceChart = ({
  height,
  timeframe
}: {
  height: string
  timeframe: HistoryTimeframe
}) => {
  const { portfolioAssets } = usePortfolioAssets()

  const assets = useMemo(() => Object.keys(portfolioAssets).filter(Boolean), [portfolioAssets])
  const { balanceChartData, balanceChartDataLoading } = useBalanceChartData({
    assets,
    timeframe
  })

  // !balanceChartDataLoading && console.log(balanceChartData)

  return (
    <Card.Body p={0} height={height}>
      <Graph
        data={balanceChartData}
        loading={balanceChartDataLoading}
        isLoaded={!balanceChartDataLoading}
      />
    </Card.Body>
  )
}
