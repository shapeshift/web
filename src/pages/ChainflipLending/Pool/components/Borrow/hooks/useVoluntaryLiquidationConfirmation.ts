import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { VoluntaryLiquidationMachineCtx } from '../VoluntaryLiquidationMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const TIMEOUT_MS = 5 * 60 * 1000

export const useVoluntaryLiquidationConfirmation = () => {
  const actorRef = VoluntaryLiquidationMachineCtx.useActorRef()
  const stateValue = VoluntaryLiquidationMachineCtx.useSelector(s => s.value)
  const action = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.action)
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: loanAccountsData } = useQuery({
    ...reactQueries.chainflipLending.loanAccounts(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  useEffect(() => {
    if (!isConfirming) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        actorRef.send({
          type: 'LIQUIDATION_TIMEOUT',
          error: 'Voluntary liquidation confirmation timed out',
        })
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

    const loanAccount = loanAccountsData.find(account => account.account === scAccount)
    if (!loanAccount) return

    const hasVoluntaryLiquidation =
      loanAccount.liquidation_status !== null &&
      loanAccount.liquidation_status !== undefined &&
      typeof loanAccount.liquidation_status === 'object' &&
      'liquidation_type' in (loanAccount.liquidation_status as Record<string, unknown>) &&
      (loanAccount.liquidation_status as Record<string, unknown>).liquidation_type === 'Voluntary'

    const confirmed = action === 'initiate' ? hasVoluntaryLiquidation : !hasVoluntaryLiquidation

    if (confirmed) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      actorRef.send({ type: 'LIQUIDATION_CONFIRMED' })
    }
  }, [isConfirming, loanAccountsData, scAccount, action, actorRef])
}
