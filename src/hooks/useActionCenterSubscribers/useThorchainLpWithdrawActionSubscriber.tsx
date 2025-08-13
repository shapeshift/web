import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { getThorchainTransactionStatus } from '@/lib/utils/thorchain'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingThorchainLpWithdrawActions } from '@/state/slices/actionSlice/selectors'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  isGenericTransactionAction,
} from '@/state/slices/actionSlice/types'
import { selectTxByFilter } from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useThorchainLpWithdrawActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { openActionCenter, isDrawerOpen } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingThorchainLpWithdrawActions = useAppSelector(selectPendingThorchainLpWithdrawActions)

  const handleComplete = useCallback(
    (action: GenericTransactionAction) => {
      try {
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
      }
    },
    [dispatch, toast, isDrawerOpen, openActionCenter],
  )

  useQueries({
    queries: pendingThorchainLpWithdrawActions
      .filter(action => {
        if (action.status !== ActionStatus.Pending) return false

        if (action.transactionMetadata.displayType !== GenericTransactionDisplayType.ThorchainLP)
          return false
        if (action.type !== ActionType.Withdraw) return false

        const { txHash } = action.transactionMetadata

        // Check if the transaction is confirmed on the blockchain
        const accountId = action.transactionMetadata.accountId
        if (!accountId) return false

        // Note: looking by serializedTxIndex won't necessarily work, as for out Txs, the memo and origin memo may be different
        // we *do* have logic to get extra metadata, including the originMemo, however, it is not guaranteed to be here by the time we hit this
        // so for the sake of simplicity, we simply do a lookup by txHash, which does the do
        const tx = selectTxByFilter(store.getState(), {
          originMemo: undefined,
          txHash,
        })

        if (!tx) return false
        if (tx.status !== TxStatus.Confirmed) return false

        return true
      })
      .map(action => action as GenericTransactionAction)
      .map(action => ({
        queryKey: [
          'thorTxStatus',
          { txHash: action.transactionMetadata.txHash, skipOutbound: true },
        ],
        queryFn: async (): Promise<TxStatus> => {
          const status = await getThorchainTransactionStatus({
            txHash: action.transactionMetadata.txHash,
            skipOutbound: true, // LP withdrawal transactions don't have outbound
          })

          if (status === TxStatus.Confirmed) {
            handleComplete(action)
          }

          return status
        },
        refetchInterval: 10_000,
      })),
  })
}
