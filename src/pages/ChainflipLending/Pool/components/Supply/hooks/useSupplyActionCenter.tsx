import { useEffect, useRef } from 'react'

import { SupplyMachineCtx } from '../SupplyMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useSupplyActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigning = SupplyMachineCtx.useSelector(s => s.matches('signing'))
  const isSuccess = SupplyMachineCtx.useSelector(s => s.matches('success'))
  const isError = SupplyMachineCtx.useSelector(s => s.matches('error'))
  const assetId = SupplyMachineCtx.useSelector(s => s.context.assetId)
  const supplyAmountCryptoPrecision = SupplyMachineCtx.useSelector(
    s => s.context.supplyAmountCryptoPrecision,
  )
  const txHash = SupplyMachineCtx.useSelector(s => s.context.txHash)

  useEffect(() => {
    if (isSigning && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Supply,
        amountCryptoPrecision: supplyAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSigning, accountId, createAction, supplyAmountCryptoPrecision, assetId])

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
