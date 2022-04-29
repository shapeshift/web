import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { InformationalAlert } from 'components/InformationalAlert/InformationalAlert'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { calculatePercentChange } from 'lib/charts'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectBalanceHistoryAvailableByAssetsAndTimeframe } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type BalanceChartArgs = {
  assetIds: CAIP19[]
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

  const isAtLeastOnePriceHistoryAvailable = useAppSelector(state =>
    selectBalanceHistoryAvailableByAssetsAndTimeframe(state, assetIds, timeframe),
  )

  useEffect(
    () => setPercentChange(calculatePercentChange(balanceChartData)),
    [balanceChartData, setPercentChange],
  )

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  if (!balanceChartDataLoading && !isAtLeastOnePriceHistoryAvailable)
    return (
      <Card.Body p={0}>
        <InformationalAlert translation='assets.assetDetails.assetHeader.assetUnavailable' />
      </Card.Body>
    )

  return (
    <Card.Body p={0} height='350px'>
      <Graph
        color={color}
        data={balanceChartData}
        loading={balanceChartDataLoading}
        isLoaded={!balanceChartDataLoading}
      />
    </Card.Body>
  )
}
