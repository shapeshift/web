import React, { useContext } from 'react'
import { useSelector } from 'react-redux'
import { flattenTokenBalances, useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { usePubkeys } from 'hooks/usePubkeys/usePubkeys'
import { useGetAssetsQuery } from 'state/slices/assetsSlice/assetsSlice'
import { useFindAllQuery } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioTotalFiatBalance,
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
  const totalBalance = useSelector(selectPortfolioTotalFiatBalance)

  useGetAssetsQuery() // load all assets
  useFindAllQuery() // load all market data
  useGetAccountsQuery(usePubkeys()) // load portfolio when wallet is loaded

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
