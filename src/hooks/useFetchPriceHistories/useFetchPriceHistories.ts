import { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

type UseFetchPriceHistoriesArgs = {
  assetIds: AssetId[]
  timeframe: HistoryTimeframe
}

type UseFetchPriceHistories = (args: UseFetchPriceHistoriesArgs) => void

export const useFetchPriceHistories: UseFetchPriceHistories = ({ assetIds, timeframe }) => {
  const dispatch = useAppDispatch()
  useEffect(
    () =>
      assetIds.forEach(assetId =>
        dispatch(marketApi.endpoints.findPriceHistoryByCaip19.initiate({ assetId, timeframe })),
      ),
    // assetIds ref changes, prevent infinite render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(assetIds), dispatch, timeframe],
  )
}
