import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { calculatePercentChange } from 'lib/charts'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import {
  selectPriceHistoriesEmptyByAssetTimeframe,
  selectPriceHistoriesErroredByAssetTimeframe,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { MissingDataMessage } from 'components/MissingDataFeedback/Message'

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

  const priceHistoryDataErrors = useAppSelector(state =>
    selectPriceHistoriesErroredByAssetTimeframe(state, assetIds, timeframe),
  )
  const priceHistoryDataEmpty = useAppSelector(state =>
    selectPriceHistoriesEmptyByAssetTimeframe(state, assetIds, timeframe),
  )

  useEffect(
    () => setPercentChange(calculatePercentChange(balanceChartData)),
    [balanceChartData, setPercentChange],
  )

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  return (
    <Card.Body p={0} height='350px'>
      {!balanceChartDataLoading && priceHistoryDataErrors.length > 0 ? (
        // one or more asset API request errored, so balance can't be computed
        <MissingDataMessage tkey='balanceHistoryErrored' />
      ) : !balanceChartDataLoading && priceHistoryDataEmpty.length === assetIds.length ? (
        // no assets displayed in the chart have data at this timeframe, so balance can't be computed
        <MissingDataMessage tkey='balanceHistoryUnavailable' />
      ) : (
        <Graph
          color={color}
          data={balanceChartData}
          loading={balanceChartDataLoading}
          isLoaded={!balanceChartDataLoading}
        />
      )}
    </Card.Body>
  )
}
