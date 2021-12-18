import { CAIP19 } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useSelector } from 'react-redux'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

type UseFetchPriceHistoryArgs = {
  assetId: CAIP19 // []
  timeframe: HistoryTimeframe
}

type UseFetchPriceHistoryReturn = {
  priceHistoryDataLoading: boolean
}

// TODO(0xdef1cafe): figure this out
type UseFetchPriceHistory = (args: UseFetchPriceHistoryArgs) => UseFetchPriceHistoryReturn

export const useFetchPriceHistory: UseFetchPriceHistory = ({ assetId, timeframe }) => {
  const dispatch = useAppDispatch()
  const args = { assetId, timeframe }
  // kick off the network request
  dispatch(marketApi.endpoints.findPriceHistoryByCaip19.initiate(args))
  // fancy selectory factory from RTK query
  const selectPriceHistory = marketApi.endpoints.findPriceHistoryByCaip19.select(args)
  // get the loading state of the query
  const { isLoading: priceHistoryDataLoading } = useSelector(selectPriceHistory)
  // we only return loading state, other selectors responsible for getting the data
  return { priceHistoryDataLoading }
}
