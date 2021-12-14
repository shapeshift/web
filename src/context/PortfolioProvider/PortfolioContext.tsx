import React, { useEffect } from 'react'
import { usePubkeys } from 'hooks/usePubkeys/usePubkeys'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import { useGetAccountsQuery } from 'state/slices/portfolioSlice/portfolioSlice'

// TODO(0xdef1cafe): make this a data provider
export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  useGetAssetsQuery() // load all assets
  useFindAllQuery() // load all market data
  const { data: portfolio, isLoading: portfolioLoading } = useGetAccountsQuery(usePubkeys()) // load portfolio when wallet is loaded

  useEffect(() => {
    if (portfolioLoading || !portfolio) return
  }, [portfolio, portfolioLoading])
  return <>{children}</>
}
