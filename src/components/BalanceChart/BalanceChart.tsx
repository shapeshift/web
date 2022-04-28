import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { MissingDataMessage } from 'components/MissingDataFeedback/Message'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { calculatePercentChange } from 'lib/charts'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectPriceHistoriesEmptyByAssetTimeframe } from 'state/slices/selectors'
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

  const priceHistoryDataEmpty = useAppSelector(state =>
    selectPriceHistoriesEmptyByAssetTimeframe(state, assetIds, timeframe),
  )

  useEffect(
    () => setPercentChange(calculatePercentChange(balanceChartData)),
    [balanceChartData, setPercentChange],
  )

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  if (!balanceChartDataLoading && isPriceHistoryDataEmpty)
    return (
      <Card.Body p={0}>
        <MissingDataMessage tkey='balanceHistoryUnavailable' />
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
