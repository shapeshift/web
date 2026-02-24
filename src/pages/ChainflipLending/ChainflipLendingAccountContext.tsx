import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react'

import { ethAddressToScAccount } from '@/lib/chainflip/account'
import { selectAccountNumberByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChainflipLendingAccountContextType = {
  accountId: AccountId | undefined
  accountNumber: number
  scAccount: string | undefined
  setAccountId: (accountId: AccountId | undefined) => void
}

const ChainflipLendingAccountContext = createContext<
  ChainflipLendingAccountContextType | undefined
>(undefined)

export const ChainflipLendingAccountProvider: React.FC<{
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

  const scAccount = useMemo(() => {
    if (!accountId) return undefined
    try {
      const { account } = fromAccountId(accountId)
      return ethAddressToScAccount(account)
    } catch {
      return undefined
    }
  }, [accountId])

  const setAccountId = useCallback((nextAccountId: AccountId | undefined) => {
    setUserSelectedAccountId(nextAccountId)
  }, [])

  const value = useMemo(
    () => ({ accountId, accountNumber, scAccount, setAccountId }),
    [accountId, accountNumber, scAccount, setAccountId],
  )

  return (
    <ChainflipLendingAccountContext.Provider value={value}>
      {children}
    </ChainflipLendingAccountContext.Provider>
  )
})

export const useChainflipLendingAccount = () => {
  const context = useContext(ChainflipLendingAccountContext)
  if (context === undefined) {
    return {
      accountId: undefined,
      accountNumber: 0,
      scAccount: undefined,
      setAccountId: () => {},
    }
  }
  return context
}
