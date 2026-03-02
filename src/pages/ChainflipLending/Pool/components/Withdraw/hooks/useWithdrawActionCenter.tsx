import { useEffect, useRef } from 'react'

import { WithdrawMachineCtx } from '../WithdrawMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useWithdrawActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigningBatch = WithdrawMachineCtx.useSelector(s => s.matches('signing_batch'))
  const isSigningRemove = WithdrawMachineCtx.useSelector(s => s.matches('signing_remove'))
  const isSuccess = WithdrawMachineCtx.useSelector(s => s.matches('success'))
  const isError = WithdrawMachineCtx.useSelector(s => s.matches('error'))
  const assetId = WithdrawMachineCtx.useSelector(s => s.context.assetId)
  const withdrawAmountCryptoPrecision = WithdrawMachineCtx.useSelector(
    s => s.context.withdrawAmountCryptoPrecision,
  )
  const egressTxRef = WithdrawMachineCtx.useSelector(s => s.context.egressTxRef)

  useEffect(() => {
    if ((isSigningBatch || isSigningRemove) && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Withdraw,
        amountCryptoPrecision: withdrawAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [
    isSigningBatch,
    isSigningRemove,
    accountId,
    createAction,
    withdrawAmountCryptoPrecision,
    assetId,
  ])

  useEffect(() => {
    if (isSuccess && actionIdRef.current) {
      completeAction(actionIdRef.current, undefined, egressTxRef ?? undefined)
      actionIdRef.current = null
    }
  }, [isSuccess, completeAction, egressTxRef])

  useEffect(() => {
    if (isError && actionIdRef.current) {
      failAction(actionIdRef.current)
      actionIdRef.current = null
    }
  }, [isError, failAction])
}
