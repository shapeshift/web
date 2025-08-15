import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { getThorchainTransactionStatus } from '@/lib/utils/thorchain'
import { reactQueries } from '@/react-queries'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingThorchainLpActions } from '@/state/slices/actionSlice/selectors'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectTxByFilter } from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useThorchainLpActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { openActionCenter, isDrawerOpen } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingThorchainLpActions = useAppSelector(selectPendingThorchainLpActions)

  const queryClient = useQueryClient()

  const handleComplete = useCallback(
    async (action: GenericTransactionAction) => {
      const isDeposit = action.type === ActionType.Deposit
      try {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Complete,
            transactionMetadata: {
              ...action.transactionMetadata,
              message: `actionCenter.thorchainLp.${isDeposit ? 'deposit' : 'withdraw'}.complete`,
            },
          }),
        )

        await queryClient.invalidateQueries({
          predicate: query => {
            // Paranoia using a predicate vs. a queryKey here, to ensure queries *actually* get invalidated
            const shouldInvalidate = query.queryKey?.[0] === reactQueries.thorchainLp._def[0]
            return shouldInvalidate
          },
          type: 'all',
        })

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
    [dispatch, toast, isDrawerOpen, openActionCenter, queryClient],
  )

  useQueries({
    queries: pendingThorchainLpActions
      .filter(action => {
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
      .map(action => ({
        queryKey: [
          'thorTxStatus',
          { txHash: action.transactionMetadata.txHash, skipOutbound: true },
        ],
        queryFn: async (): Promise<TxStatus> => {
          const status = await getThorchainTransactionStatus({
            txHash: action.transactionMetadata.txHash,
            skipOutbound: true, // LP transactions don't have outbound
          })

          if (status === TxStatus.Confirmed) {
            await handleComplete(action)
          }

          return status
        },
        refetchInterval: 10_000,
      })),
  })
}
