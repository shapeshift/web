import { useEffect, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useDepositActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSendingDeposit = DepositMachineCtx.useSelector(s => s.matches('sending_deposit'))
  const isSuccess = DepositMachineCtx.useSelector(s => s.matches('success'))
  const isError = DepositMachineCtx.useSelector(s => s.matches('error'))
  const assetId = DepositMachineCtx.useSelector(s => s.context.assetId)
  const depositAmountCryptoPrecision = DepositMachineCtx.useSelector(
    s => s.context.depositAmountCryptoPrecision,
  )
  const depositTxHash = DepositMachineCtx.useSelector(s => s.context.txHashes.deposit)

  useEffect(() => {
    if (isSendingDeposit && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Deposit,
        amountCryptoPrecision: depositAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSendingDeposit, accountId, createAction, depositAmountCryptoPrecision, assetId])

  useEffect(() => {
    if (isSuccess && actionIdRef.current) {
      completeAction(actionIdRef.current, depositTxHash)
      actionIdRef.current = null
    }
  }, [isSuccess, completeAction, depositTxHash])

  useEffect(() => {
    if (isError && actionIdRef.current) {
      failAction(actionIdRef.current)
      actionIdRef.current = null
    }
  }, [isError, failAction])
}
