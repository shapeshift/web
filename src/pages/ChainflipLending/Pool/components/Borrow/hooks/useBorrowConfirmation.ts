import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import { BorrowMachineCtx } from '../BorrowMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const TIMEOUT_MS = 5 * 60 * 1000

type LoanSnapshot = {
  count: number
  totalPrincipal: bigint
}

export const useBorrowConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = BorrowMachineCtx.useActorRef()
  const stateValue = BorrowMachineCtx.useSelector(s => s.value)
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const snapshotRef = useRef<LoanSnapshot | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const invalidateQueries = useCallback(async () => {
    if (!scAccount) return
    await Promise.all([
      queryClient.invalidateQueries(reactQueries.chainflipLending.freeBalances(scAccount)),
      queryClient.invalidateQueries(reactQueries.chainflipLending.accountInfo(scAccount)),
      queryClient.invalidateQueries(reactQueries.chainflipLending.loanAccounts(scAccount)),
    ])
  }, [queryClient, scAccount])

  const { data: loanAccountsData } = useQuery({
    ...reactQueries.chainflipLending.loanAccounts(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  useEffect(() => {
    if (!isConfirming) {
      snapshotRef.current = null
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
    const loans = myAccount?.loans ?? []
    const currentCount = loans.length
    const currentTotalPrincipal = loans.reduce((sum, l) => {
      try {
        return sum + BigInt(l.principal_amount)
      } catch {
        return sum
      }
    }, 0n)

    if (snapshotRef.current === null) {
      snapshotRef.current = { count: currentCount, totalPrincipal: currentTotalPrincipal }
      return
    }

    const hasNewLoan = currentCount > snapshotRef.current.count
    const hasIncreasedPrincipal = currentTotalPrincipal > snapshotRef.current.totalPrincipal

    if (hasNewLoan || hasIncreasedPrincipal) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      void invalidateQueries()
      actorRef.send({ type: 'BORROW_CONFIRMED' })
    }
  }, [isConfirming, loanAccountsData, scAccount, actorRef, invalidateQueries])
}
