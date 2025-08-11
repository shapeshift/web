import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { waitForThorchainUpdate } from '@/lib/utils/thorchain'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingThorchainLpWithdrawActions } from '@/state/slices/actionSlice/selectors'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  isGenericTransactionAction,
} from '@/state/slices/actionSlice/types'
import { selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useThorchainLpWithdrawActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { openActionCenter, isDrawerOpen } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingThorchainLpWithdrawActions = useAppSelector(selectPendingThorchainLpWithdrawActions)
  const txs = useAppSelector(selectTxs)

  const handleThorchainUpdate = useCallback(
    async (action: GenericTransactionAction) => {
      const { txHash } = action.transactionMetadata

      try {
        // Wait for THORChain to actually process and update the LP position
        await waitForThorchainUpdate({
          txId: txHash,
          skipOutbound: true, // LP withdrawal transactions don't have outbound
        }).promise

        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Complete,
            transactionMetadata: {
              ...action.transactionMetadata,
              message: 'actionCenter.thorchainLp.withdraw.complete',
            },
          }),
        )

        const actionId = action.id
        if (toast.isActive(actionId)) return

        toast({
          id: action.id,
          duration: isDrawerOpen ? 5000 : null,
          status: 'success',
          render: ({ onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }
            return (
              <GenericTransactionNotification
                // eslint-disable-next-line react-memo/require-usememo
                handleClick={handleClick}
                actionId={action.id}
                onClose={onClose}
                {...props}
              />
            )
          },
        })
      } catch (error) {
        console.error('Error waiting for THORChain update:', error)
        // Don't mark as failed here - the transaction might still be processing
        // We'll let the existing retry mechanisms handle it
      }
    },
    [dispatch, toast, isDrawerOpen, openActionCenter],
  )

  useEffect(() => {
    pendingThorchainLpWithdrawActions.forEach(action => {
      if (action.status !== ActionStatus.Pending) return

      // Only handle THORChain LP withdrawal actions
      if (!isGenericTransactionAction(action)) return
      if (action.transactionMetadata.displayType !== GenericTransactionDisplayType.ThorchainLP)
        return
      if (action.type !== ActionType.Withdraw) return

      const { txHash } = action.transactionMetadata

      // Check if the transaction is confirmed on the blockchain
      const accountId = action.transactionMetadata.accountId
      if (!accountId) return

      const accountAddress = fromAccountId(accountId).account
      const serializedTxIndex = serializeTxIndex(accountId, txHash, accountAddress)
      const tx = txs[serializedTxIndex]

      if (!tx) return
      if (tx.status !== TxStatus.Confirmed) return

      // Now wait for THORChain to process and update the LP position
      handleThorchainUpdate(action)
    })
  }, [pendingThorchainLpWithdrawActions, txs, handleThorchainUpdate])
}
