import isEmpty from 'lodash/isEmpty'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAccountSpecifiers } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
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

  // once the wallet is connected, reach out to unchained to fetch
  // accounts for each chain/account specifier combination
  useEffect(() => {
    if (isEmpty(accountSpecifiers)) return
    // clear the old portfolio, we have different non null data, we're switching wallet
    dispatch(portfolio.actions.clearPortfolio())
    // fetch each account
    accountSpecifiers.forEach(accountSpecifier =>
      dispatch(portfolioApi.endpoints.getAccount.initiate(accountSpecifier))
    )
  }, [dispatch, accountSpecifiers])

  // we only prefetch market data for the top 1000 assets
  // once the portfolio has loaded, check we have market data
  // for more obscure assets, if we don't have it, fetch it
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const marketData = useSelector(selectMarketData)
  useEffect(() => {
    if (!portfolioAssetIds.length) return
    portfolioAssetIds.forEach(assetId => {
      if (!marketData[assetId]) dispatch(marketApi.endpoints.findByCaip19.initiate(assetId))
    })
  }, [portfolioAssetIds, marketData, dispatch])

  return <>{children}</>
}
