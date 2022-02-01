import isEmpty from 'lodash/isEmpty'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAccountSpecifiers } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { selectAssetIds, useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  selectMarketData,
  useFindAllQuery
} from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioAssetIds } from 'state/slices/portfolioSlice/selectors'

// TODO(0xdef1cafe): make this a data provider
export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch()
  // immediately load all assets, before the wallet is even connected,
  // so the app is functional and ready
  useGetAssetsQuery()

  // load top 1000 assets market data
  // this is needed to sort assets by market cap
  // and covers most assets users will have
  useFindAllQuery()
  const accountSpecifiers = useAccountSpecifiers()
  const assetIds = useSelector(selectAssetIds)

  // once the wallet is connected, reach out to unchained to fetch
  // accounts for each chain/account specifier combination
  useEffect(() => {
    if (isEmpty(accountSpecifiers)) return
    // clear the old portfolio, we have different non null data, we're switching wallet
    dispatch(portfolio.actions.clear())
    // fetch each account
    accountSpecifiers.forEach(accountSpecifierMap =>
      // forceRefetch is enabled here to make sure that we always have the latest wallet information
      // it also forces queryFn to run and that's needed for the wallet info to be dispatched
      dispatch(
        portfolioApi.endpoints.getAccount.initiate(
          { accountSpecifierMap, assetIds },
          { forceRefetch: true }
        )
      )
    )
  }, [dispatch, accountSpecifiers, assetIds])

  // we only prefetch market data for the top 1000 assets
  // once the portfolio has loaded, check we have market data
  // for more obscure assets, if we don't have it, fetch it
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const marketData = useSelector(selectMarketData)

  // creating a variable to store the intervals in
  const [marketDataIntervalId, setMarketDataIntervalId] = useState<NodeJS.Timer | undefined>()

  useEffect(() => {
    if (!portfolioAssetIds.length) return
    // checking if marketDataIntervalId is set, if yes we clear the previous interval
    if (marketDataIntervalId) {
      clearInterval(marketDataIntervalId)
      setMarketDataIntervalId(undefined)
    }
    // set the new interval, we set a new interval as the user's assets can change depending on their wallet portfolio
    setMarketDataIntervalId(
      setInterval(() => {
        portfolioAssetIds.forEach(assetId => {
          dispatch(marketApi.endpoints.findByCaip19.initiate(assetId, { forceRefetch: true }))
        })
        // update assets every two minutes
      }, 120000)
    )
    // we need to disable this rule as we dont want this hook to run everytime marketDataIntervalId is updated
    // this will end up causing an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioAssetIds, marketData, dispatch])

  return <>{children}</>
}
