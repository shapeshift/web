import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { BorrowMachineCtx } from '../BorrowMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const TIMEOUT_MS = 120_000

export const useBorrowConfirmation = () => {
  const actorRef = BorrowMachineCtx.useActorRef()
  const stateValue = BorrowMachineCtx.useSelector(s => s.value)
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const initialLoansCountRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: loanAccountsData } = useQuery({
    ...reactQueries.chainflipLending.loanAccounts(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  useEffect(() => {
    if (!isConfirming) {
      initialLoansCountRef.current = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        actorRef.send({ type: 'BORROW_TIMEOUT', error: 'Loan confirmation timed out' })
      }, TIMEOUT_MS)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isConfirming, actorRef])

  useEffect(() => {
    if (!isConfirming || !loanAccountsData || !scAccount) return

    const myAccount = loanAccountsData.find(account => account.account === scAccount)
    const currentLoansCount = myAccount?.loans?.length ?? 0

    if (initialLoansCountRef.current === null) {
      initialLoansCountRef.current = currentLoansCount
      return
    }

    if (currentLoansCount > initialLoansCountRef.current) {
      actorRef.send({ type: 'BORROW_CONFIRMED' })
    }
  }, [isConfirming, loanAccountsData, scAccount, actorRef])
}
