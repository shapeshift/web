import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAccountSpecifiers } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectPortfolioAssetIds,
  selectTxHistoryStatus,
  selectTxIds,
  selectTxs
} from 'state/slices/selectors'

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

  const txIds = useSelector(selectTxIds)
  const txsById = useSelector(selectTxs)
  const txHistoryStatus = useSelector(selectTxHistoryStatus)

  /**
   * portfolio refetch on new tx logic
   */
  useEffect(() => {
    // we only want to refetch portfolio if a new tx comes in after we're finished loading
    if (txHistoryStatus !== 'loaded') return
    // don't fire with nothing connected
    if (isEmpty(accountSpecifiers)) return
    // grab the most recent txId
    const txId = head(txIds)!
    // grab the actual tx
    const tx = txsById[txId]
    // always wear protection, or don't it's your choice really
    if (!tx) return
    // the chain the tx came from
    const txChainId = tx.caip2
    // only refetch accounts for this tx
    const accountSpecifierMap = accountSpecifiers.reduce((acc, cur) => {
      const [chainId, accountSpecifier] = Object.entries(cur)[0]
      if (chainId !== txChainId) return acc
      acc[chainId] = accountSpecifier
      return acc
    }, {})
    // bust the cache
    const forceRefetch = true
    // refetch that account
    dispatch(portfolioApi.endpoints.getAccount.initiate({ accountSpecifierMap }, { forceRefetch }))
    // txsById changes on each tx - as txs have more confirmations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountSpecifiers, dispatch, txIds, txHistoryStatus])

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
