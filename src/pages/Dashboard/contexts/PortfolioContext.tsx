import React, { useContext } from 'react'
import { flattenTokenBalances, useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'

// import { usePubkeys } from 'hooks/usePubkeys/usePubkeys'
// import { useGetAccountsQuery } from 'state/slices/portfolioSlice/portfolioSlice'
import { useTotalBalance } from '../hooks/useTotalBalance/useTotalBalance'

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
