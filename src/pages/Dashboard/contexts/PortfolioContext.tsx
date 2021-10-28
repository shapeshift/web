import React, { useContext, useMemo } from 'react'
import { useBalances } from 'hooks/useBalances/useBalances'

import { flattenAccounts, FlattenedAccount } from '../helpers/flattenAccounts'
import { useTotalBalance } from '../hooks/useTotalBalance'

type PortfolioContextProps = {
  totalBalance: number
  loading: boolean
  accountsList: FlattenedAccount[]
}

const PortfolioContext = React.createContext<PortfolioContextProps | null>(null)

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const { balances: accounts, loading } = useBalances()
  const accountsList = useMemo(() => {
    return flattenAccounts(accounts)
  }, [accounts])

  const totalBalance = useTotalBalance(accountsList)

  return (
    <PortfolioContext.Provider value={{ totalBalance, loading, accountsList }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error("usePortfolio can't be used outside of a PortfolioProvider")
  return context
}
