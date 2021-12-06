import isEmpty from 'lodash/isEmpty'
import React, { useContext, useEffect } from 'react'
import { flattenTokenBalances, useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { usePubkeys } from 'hooks/usePubkeys/usePubkeys'

import { useTotalBalance } from '../hooks/useTotalBalance/useTotalBalance'

type PortfolioContextProps = {
  totalBalance: number
  loading: boolean
  balances: ReturnType<typeof flattenTokenBalances>
}

const PortfolioContext = React.createContext<PortfolioContextProps | null>(null)

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const { balances, loading } = useFlattenedBalances()
  const totalBalance = useTotalBalance(balances)

  const pubkeys = usePubkeys()

  useEffect(() => {
    if (isEmpty(pubkeys)) return
    console.info('PortfolioProvider pubkeys', pubkeys)
  }, [pubkeys])

  // TOOD(0xdef1cafe): go ham on this and replace all the other hooks
  // const CAIP2 = 'eip155:1'
  // const pubkey = '0x934be745172066EDF795ffc5EA9F28f19b440c63'
  // const { data, error, isLoading } = useGetAccountQuery({ CAIP2, pubkey })

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
