import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react'

type YieldAccountContextType = {
  accountNumber: number
  setAccountNumber: (accountNumber: number) => void
}

const YieldAccountContext = createContext<YieldAccountContextType | undefined>(undefined)

export const YieldAccountProvider: React.FC<{ children: React.ReactNode }> = memo(
  ({ children }) => {
    const [accountNumber, setAccountNumberState] = useState(0)

    const setAccountNumber = useCallback((accountNumber: number) => {
      setAccountNumberState(accountNumber)
    }, [])

    const value = useMemo(
      () => ({ accountNumber, setAccountNumber }),
      [accountNumber, setAccountNumber],
    )

    return <YieldAccountContext.Provider value={value}>{children}</YieldAccountContext.Provider>
  },
)

export const useYieldAccount = () => {
  const context = useContext(YieldAccountContext)
  // Fallback to account 0 when used outside YieldAccountProvider (e.g., YieldAssetSection on asset pages)
  if (context === undefined) {
    return { accountNumber: 0, setAccountNumber: () => {} }
  }
  return context
}
