import { useEffect, useRef } from 'react'

import { WithdrawMachineCtx } from '../WithdrawMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useWithdrawActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigning = WithdrawMachineCtx.useSelector(s => s.matches('signing'))
  const isSuccess = WithdrawMachineCtx.useSelector(s => s.matches('success'))
  const isError = WithdrawMachineCtx.useSelector(s => s.matches('error'))
  const assetId = WithdrawMachineCtx.useSelector(s => s.context.assetId)
  const withdrawAmountCryptoPrecision = WithdrawMachineCtx.useSelector(
    s => s.context.withdrawAmountCryptoPrecision,
  )
  const txHash = WithdrawMachineCtx.useSelector(s => s.context.txHash)

  useEffect(() => {
    if (isSigning && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Withdraw,
        amountCryptoPrecision: withdrawAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSigning, accountId, createAction, withdrawAmountCryptoPrecision, assetId])

  useEffect(() => {
    if (isSuccess && actionIdRef.current) {
      completeAction(actionIdRef.current, txHash ?? undefined)
      actionIdRef.current = null
    }
  }, [isSuccess, completeAction, txHash])

  useEffect(() => {
    if (isError && actionIdRef.current) {
      failAction(actionIdRef.current)
      actionIdRef.current = null
    }
  }, [isError, failAction])
}
