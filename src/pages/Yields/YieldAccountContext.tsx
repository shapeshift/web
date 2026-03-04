import type { AccountId } from '@shapeshiftoss/caip'
import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react'

import { selectAccountNumberByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldAccountContextType = {
  accountId: AccountId | undefined
  accountNumber: number
  setAccountId: (accountId: AccountId | undefined) => void
}

const YieldAccountContext = createContext<YieldAccountContextType | undefined>(undefined)

export const YieldAccountProvider: React.FC<{
  children: React.ReactNode
  initialAccountId?: AccountId
}> = memo(({ children, initialAccountId }) => {
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const [userSelectedAccountId, setUserSelectedAccountId] = useState<AccountId | undefined>(
    initialAccountId,
  )

  const accountId = useMemo(
    () => userSelectedAccountId ?? enabledWalletAccountIds[0],
    [userSelectedAccountId, enabledWalletAccountIds],
  )

  const accountNumber = useAppSelector(state => {
    if (!accountId) return 0
    const foundAccountNumber = selectAccountNumberByAccountId(state, { accountId })
    return foundAccountNumber ?? 0
  })

  const setAccountId = useCallback((nextAccountId: AccountId | undefined) => {
    setUserSelectedAccountId(nextAccountId)
  }, [])

  const value = useMemo(
    () => ({ accountId, accountNumber, setAccountId }),
    [accountId, accountNumber, setAccountId],
  )

  return <YieldAccountContext.Provider value={value}>{children}</YieldAccountContext.Provider>
})

export const useYieldAccount = () => {
  const context = useContext(YieldAccountContext)
  if (context === undefined) {
    return {
      accountId: undefined,
      accountNumber: 0,
      setAccountId: () => {},
    }
  }
  return context
}
