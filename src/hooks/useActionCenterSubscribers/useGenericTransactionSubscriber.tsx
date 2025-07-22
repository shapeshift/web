import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingGenericTransactionActions } from '@/state/slices/actionSlice/selectors'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useGenericTransactionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingGenericTransactionActions = useAppSelector(selectPendingGenericTransactionActions)
  const txs = useAppSelector(selectTxs)

  useEffect(() => {
    pendingGenericTransactionActions.forEach(action => {
      if (action.status !== ActionStatus.Pending) return
      // RFOX stake/unstake only for now, TODO: handle more
      if (action.transactionMetadata.displayType !== GenericTransactionDisplayType.RFOX) return

      const { accountId, txHash } = action.transactionMetadata
      const accountAddress = fromAccountId(accountId).account
      const serializedTxIndex = serializeTxIndex(accountId, txHash, accountAddress)
      const tx = txs[serializedTxIndex]

      if (!tx) return
      if (tx.status !== TxStatus.Confirmed) return

      // TODO(gomes): refer to the todo above, for now this just handles RFOX stake/unstake - to-be-generalized when handling more providers/actions
      const message =
        action.type === ActionType.Deposit ? 'RFOX.stakeSuccess' : 'RFOX.unstakeSuccess'

      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Complete,
          transactionMetadata: {
            ...action.transactionMetadata,
            message,
          },
        }),
      )

      // No double-toasty
      if (toast.isActive(action.transactionMetadata.txHash)) return

      toast({
        id: action.transactionMetadata.txHash,
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
    })
  }, [pendingGenericTransactionActions, dispatch, txs, isDrawerOpen, openActionCenter, toast])
}
