import React, { useContext } from 'react'
import { Balances, useBalances } from 'hooks/useBalances/useBalances'

// import { usePubkeys } from 'hooks/usePubkeys/usePubkeys'
// import { useGetAccountsQuery } from 'state/slices/portfolioSlice/portfolioSlice'
import { useTotalBalance } from '../hooks/useTotalBalance/useTotalBalance'

type PortfolioContextProps = {
  totalBalance: number
  loading: boolean
  balances: Balances
}

const PortfolioContext = React.createContext<PortfolioContextProps | null>(null)

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const { balances, loading } = useBalances()
  const totalBalance = useTotalBalance(balances)

  // example of how this works
  // usePubkeys will change when the wallet changes
  // const pubkeys = usePubkeys()
  // useGetAccountQuery manages fetching and caching accounts and balances
  // const { data, isLoading } = useGetAccountsQuery(pubkeys)

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
