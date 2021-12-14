import isEmpty from 'lodash/isEmpty'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useAccountSpecifiers } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'

// TODO(0xdef1cafe): make this a data provider
export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch()
  useGetAssetsQuery() // load all assets
  useFindAllQuery() // load top 1000 assets market data
  const pubkeys = useAccountSpecifiers()

  useEffect(() => {
    if (isEmpty(pubkeys)) return
    // fetch each account
    pubkeys.forEach(pubkey => dispatch(portfolioApi.endpoints.getAccount.initiate(pubkey)))
  }, [dispatch, pubkeys])

  return <>{children}</>
}
