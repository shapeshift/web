import React, { createContext, useContext, useState } from 'react'

type YieldAccountContextType = {
  accountNumber: number
  setAccountNumber: (accountNumber: number) => void
}

const YieldAccountContext = createContext<YieldAccountContextType | undefined>(undefined)

export const YieldAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountNumber, setAccountNumber] = useState(0)

  return (
    <YieldAccountContext.Provider value={{ accountNumber, setAccountNumber }}>
      {children}
    </YieldAccountContext.Provider>
  )
}

export const useYieldAccount = () => {
  const context = useContext(YieldAccountContext)
  if (context === undefined) {
    throw new Error('useYieldAccount must be used within a YieldAccountProvider')
  }
  return context
}
