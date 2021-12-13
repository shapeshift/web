import React, { useContext, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { flattenTokenBalances, useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { usePubkeys } from 'hooks/usePubkeys/usePubkeys'
import { useTotalBalance } from 'pages/Dashboard/hooks/useTotalBalance/useTotalBalance'
import { assetApi, useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioAssetIds,
  useGetAccountsQuery
} from 'state/slices/portfolioSlice/portfolioSlice'

type PortfolioContextProps = {
  totalBalance: number
  loading: boolean
  balances: ReturnType<typeof flattenTokenBalances>
}

const PortfolioContext = React.createContext<PortfolioContextProps | null>(null)

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  // these get replaced by selectors
  const { balances, loading } = useFlattenedBalances()
  const totalBalance = useTotalBalance(balances)
  const dispatch = useDispatch()

  // we always want to load asset and market cap data for the app to work
  useGetAssetsQuery()
  useFindAllQuery()

  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)

  const pubkeys = usePubkeys() // pubkeys change when the wallet changes
  const { isLoading: isPortfolioLoading } = useGetAccountsQuery(pubkeys)

  // eagerly load asset descriptions
  useEffect(() => {
    if (isPortfolioLoading) return
    if (!portfolioAssetIds.length) return
    dispatch(assetApi.endpoints.getAssetDescriptions.initiate(portfolioAssetIds))
  }, [isPortfolioLoading, portfolioAssetIds, dispatch])

  return (
    <PortfolioContext.Provider value={{ totalBalance, loading, balances }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error("usePortfolio can't be used outside of a PortfolioProvider")
  return context
}
