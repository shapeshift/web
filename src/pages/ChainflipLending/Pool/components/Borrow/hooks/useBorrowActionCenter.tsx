import { useEffect, useRef } from 'react'

import { BorrowMachineCtx } from '../BorrowMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useBorrowActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigning = BorrowMachineCtx.useSelector(s => s.matches('signing'))
  const isSuccess = BorrowMachineCtx.useSelector(s => s.matches('success'))
  const isError = BorrowMachineCtx.useSelector(s => s.matches('error'))
  const assetId = BorrowMachineCtx.useSelector(s => s.context.assetId)
  const borrowAmountCryptoPrecision = BorrowMachineCtx.useSelector(
    s => s.context.borrowAmountCryptoPrecision,
  )
  useEffect(() => {
    if (isSigning && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Borrow,
        amountCryptoPrecision: borrowAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSigning, accountId, createAction, borrowAmountCryptoPrecision, assetId])

  useEffect(() => {
    if (isSuccess && actionIdRef.current) {
      completeAction(actionIdRef.current)
      actionIdRef.current = null
    }
  }, [isSuccess, completeAction])

  useEffect(() => {
    if (isError && actionIdRef.current) {
      failAction(actionIdRef.current)
      actionIdRef.current = null
    }
  }, [isError, failAction])
}
