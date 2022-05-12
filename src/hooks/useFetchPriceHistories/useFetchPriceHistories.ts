import { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

type UseFetchPriceHistoriesArgs = {
  assetIds: AssetId[]
  timeframe: HistoryTimeframe
}

type UseFetchPriceHistories = (args: UseFetchPriceHistoriesArgs) => void

export const useFetchPriceHistories: UseFetchPriceHistories = ({ assetIds, timeframe }) => {
  const dispatch = useAppDispatch()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  useEffect(
    () =>
      assetIds.forEach(assetId =>
        dispatch(marketApi.endpoints.findPriceHistoryByCaip19.initiate({ assetId, timeframe })),
      ),
    // assetIds ref changes, prevent infinite render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(assetIds), dispatch, timeframe],
  )
  useEffect(() => {
    dispatch(
      marketApi.endpoints.findPriceHistoryByFiatSymbol.initiate({
        symbol: selectedCurrency,
        timeframe
      })
    )
  }, [dispatch, selectedCurrency, timeframe])
}
