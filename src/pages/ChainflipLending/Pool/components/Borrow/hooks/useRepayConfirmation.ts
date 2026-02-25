import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { RepayMachineCtx } from '../RepayMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const TIMEOUT_MS = 5 * 60 * 1000

export const useRepayConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = RepayMachineCtx.useActorRef()
  const stateValue = RepayMachineCtx.useSelector(s => s.value)
  const { loanId, isFullRepayment, outstandingDebtCryptoBaseUnit } = RepayMachineCtx.useSelector(
    s => ({
      loanId: s.context.loanId,
      isFullRepayment: s.context.isFullRepayment,
      outstandingDebtCryptoBaseUnit: s.context.outstandingDebtCryptoBaseUnit,
    }),
  )
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'

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

  const loanAccount = useMemo(() => {
    if (!loanAccountsData || !scAccount) return undefined
    return loanAccountsData.find(account => account.account === scAccount)
  }, [loanAccountsData, scAccount])

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isConfirming) {
      timeoutRef.current = setTimeout(() => {
        actorRef.send({ type: 'REPAY_TIMEOUT', error: 'Confirmation timed out' })
      }, TIMEOUT_MS)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isConfirming, actorRef])

  useEffect(() => {
    if (!isConfirming || !loanAccount) return

    const matchingLoan = loanAccount.loans.find(l => l.loan_id === loanId)

    if (isFullRepayment) {
      if (!matchingLoan) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        void invalidateQueries()
        actorRef.send({ type: 'REPAY_CONFIRMED' })
      }
      return
    }

    if (!matchingLoan?.principal_amount) return

    try {
      const currentPrincipal = BigInt(matchingLoan.principal_amount)
      const previousDebt = BigInt(outstandingDebtCryptoBaseUnit || '0')

      if (currentPrincipal < previousDebt) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        void invalidateQueries()
        actorRef.send({ type: 'REPAY_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [
    isConfirming,
    loanAccount,
    loanId,
    isFullRepayment,
    outstandingDebtCryptoBaseUnit,
    actorRef,
    invalidateQueries,
  ])
}
