import { useEffect, useRef } from 'react'

import { RepayMachineCtx } from '../RepayMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useRepayActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigning = RepayMachineCtx.useSelector(s => s.matches('signing'))
  const isSuccess = RepayMachineCtx.useSelector(s => s.matches('success'))
  const isError = RepayMachineCtx.useSelector(s => s.matches('error'))
  const assetId = RepayMachineCtx.useSelector(s => s.context.assetId)
  const repayAmountCryptoPrecision = RepayMachineCtx.useSelector(
    s => s.context.repayAmountCryptoPrecision,
  )
  const txHash = RepayMachineCtx.useSelector(s => s.context.txHash)

  useEffect(() => {
    if (isSigning && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Repay,
        amountCryptoPrecision: repayAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSigning, accountId, createAction, repayAmountCryptoPrecision, assetId])

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
