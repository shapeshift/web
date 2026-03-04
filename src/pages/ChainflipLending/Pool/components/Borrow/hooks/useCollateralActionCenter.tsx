import { useEffect, useRef } from 'react'

import { CollateralMachineCtx } from '../CollateralMachineContext'

import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingAction } from '@/pages/ChainflipLending/hooks/useChainflipLendingAction'
import { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'

export const useCollateralActionCenter = () => {
  const { accountId } = useChainflipLendingAccount()
  const { createAction, completeAction, failAction } = useChainflipLendingAction()
  const actionIdRef = useRef<string | null>(null)

  const isSigning = CollateralMachineCtx.useSelector(s => s.matches('signing'))
  const isSuccess = CollateralMachineCtx.useSelector(s => s.matches('success'))
  const isError = CollateralMachineCtx.useSelector(s => s.matches('error'))
  const mode = CollateralMachineCtx.useSelector(s => s.context.mode)
  const assetId = CollateralMachineCtx.useSelector(s => s.context.assetId)
  const collateralAmountCryptoPrecision = CollateralMachineCtx.useSelector(
    s => s.context.collateralAmountCryptoPrecision,
  )
  const txHash = CollateralMachineCtx.useSelector(s => s.context.txHash)

  useEffect(() => {
    if (isSigning && !actionIdRef.current && accountId) {
      actionIdRef.current = createAction({
        operationType:
          mode === 'add'
            ? ChainflipLendingOperationType.AddCollateral
            : ChainflipLendingOperationType.RemoveCollateral,
        amountCryptoPrecision: collateralAmountCryptoPrecision,
        assetId,
        accountId,
      })
    }
  }, [isSigning, accountId, createAction, mode, collateralAmountCryptoPrecision, assetId])

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
