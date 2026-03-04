import { useEffect, useRef } from 'react'

import { EgressMachineCtx } from '../EgressMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useEgressActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigning = EgressMachineCtx.useSelector(s => s.matches('signing'))
  const isSuccess = EgressMachineCtx.useSelector(s => s.matches('success'))
  const isError = EgressMachineCtx.useSelector(s => s.matches('error'))
  const assetId = EgressMachineCtx.useSelector(s => s.context.assetId)
  const egressAmountCryptoPrecision = EgressMachineCtx.useSelector(
    s => s.context.egressAmountCryptoPrecision,
  )
  const egressTxRef = EgressMachineCtx.useSelector(s => s.context.egressTxRef)

  useEffect(() => {
    if (isSigning && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType: ChainflipLendingOperationType.Egress,
        amountCryptoPrecision: egressAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSigning, accountId, createAction, egressAmountCryptoPrecision, assetId])

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
