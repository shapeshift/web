import type { AssetId } from '@keepkey/caip'
import type { HistoryTimeframe } from '@keepkey/types'
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
  const symbol = useAppSelector(selectSelectedCurrency)

  const { findPriceHistoryByAssetId, findPriceHistoryByFiatSymbol } = marketApi.endpoints
  useEffect(
    () =>
      assetIds.forEach(assetId =>
        dispatch(findPriceHistoryByAssetId.initiate({ assetId, timeframe })),
      ),
    // assetIds ref changes, prevent infinite render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assetIds, dispatch, timeframe],
  )
  useEffect(() => {
    dispatch(findPriceHistoryByFiatSymbol.initiate({ symbol, timeframe }))
  }, [dispatch, findPriceHistoryByFiatSymbol, symbol, timeframe])
}
