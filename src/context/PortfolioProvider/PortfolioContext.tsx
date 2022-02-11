import isEmpty from 'lodash/isEmpty'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAccountSpecifiers } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioAssetIds } from 'state/slices/portfolioSlice/selectors'
import { ipcRenderer } from 'electron'

/**
 * note - be super careful playing with this component, as it's responsible for asset,
 * market data, and portfolio fetching, and we don't want to over or under fetch data,
 * from unchained, market apis, or otherwise. it's optimized such that it won't unnecessarily
 * render, and is closely related to src/hooks/useAccountSpecifiers/useAccountSpecifiers.ts
 *
 * e.g. unintentionally clearing the portfolio can create obscure bugs that don't manifest
 * for some time as reselect does a really good job of memoizing things
 *
 */
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
  ipcRenderer.send('onAccountInfo', accountSpecifiers)

  // once the wallet is connected, reach out to unchained to fetch
  // accounts for each chain/account specifier combination
  useEffect(() => {
    if (isEmpty(accountSpecifiers)) return
    // clear the old portfolio, we have different non null data, we're switching wallet
    console.info('dispatching portfolio clear action')
    dispatch(portfolio.actions.clear())
    // fetch each account
    accountSpecifiers.forEach(accountSpecifierMap =>
      // forceRefetch is enabled here to make sure that we always have the latest wallet information
      // it also forces queryFn to run and that's needed for the wallet info to be dispatched
      dispatch(
        portfolioApi.endpoints.getAccount.initiate({ accountSpecifierMap }, { forceRefetch: true })
      )
    )
  }, [dispatch, accountSpecifiers])

  // we only prefetch market data for the top 1000 assets
  // once the portfolio has loaded, check we have market data
  // for more obscure assets, if we don't have it, fetch it
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)

  // creating a variable to store the intervals in
  const [marketDataIntervalId, setMarketDataIntervalId] = useState<NodeJS.Timer | undefined>()

  // market data pre and refetch management
  useEffect(() => {
    if (!portfolioAssetIds.length) return

    const fetchMarketData = () => {
      portfolioAssetIds.forEach(assetId => {
        dispatch(marketApi.endpoints.findByCaip19.initiate(assetId, { forceRefetch: true }))
      })
    }

    // do this the first time once
    fetchMarketData()

    // clear the old timer
    if (marketDataIntervalId) {
      clearInterval(marketDataIntervalId)
      setMarketDataIntervalId(undefined)
    }

    const MARKET_DATA_REFRESH_INTERVAL = 1000 * 60 * 2 // two minutes
    setMarketDataIntervalId(setInterval(fetchMarketData, MARKET_DATA_REFRESH_INTERVAL))

    // marketDataIntervalId causes infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioAssetIds, setMarketDataIntervalId, dispatch])

  return <>{children}</>
}
