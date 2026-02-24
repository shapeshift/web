import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { RepayMachineCtx } from '../RepayMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000

export const useRepayConfirmation = () => {
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

  const { data: loanAccountsData } = useQuery({
    ...reactQueries.chainflipLending.loanAccounts(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  const loanAccount = useMemo(() => {
    if (!loanAccountsData || !scAccount) return undefined
    return loanAccountsData.find(account => account.account === scAccount)
  }, [loanAccountsData, scAccount])

  useEffect(() => {
    if (!isConfirming || !loanAccount) return

    const matchingLoan = loanAccount.loans.find(l => l.loan_id === loanId)

    if (isFullRepayment) {
      if (!matchingLoan) {
        actorRef.send({ type: 'REPAY_CONFIRMED' })
      }
      return
    }

    if (!matchingLoan?.principal_amount) return

    try {
      const currentPrincipal = BigInt(matchingLoan.principal_amount)
      const previousDebt = BigInt(outstandingDebtCryptoBaseUnit || '0')

      if (currentPrincipal < previousDebt) {
        actorRef.send({ type: 'REPAY_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [isConfirming, loanAccount, loanId, isFullRepayment, outstandingDebtCryptoBaseUnit, actorRef])
}
