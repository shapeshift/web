import { usePrevious, useToast } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect } from 'react'

import { useWallet } from '../useWallet/useWallet'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { EvergreenDepositNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/EvergreenDepositNotification'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingEvergreenDepositActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useEvergreenDepositActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const dispatch = useAppDispatch()
  const {
    state: { isConnected },
  } = useWallet()

  const toast = useToast({
    duration: isDrawerOpen ? 5000 : null,
    position: 'bottom-right',
  })

  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  const pendingEvergreenActions = useAppSelector(selectPendingEvergreenDepositActions)
  const txs = useAppSelector(selectTxs)

  // Watch transaction status directly for each pending action
  useEffect(() => {
    if (!isConnected) return

    pendingEvergreenActions.forEach(action => {
      const { stakeTxHash, accountId } = action.evergreenDepositMetadata
      if (!stakeTxHash || !accountId) return

      const accountAddress = fromAccountId(accountId).account
      const serializedTxIndex = serializeTxIndex(accountId, stakeTxHash, accountAddress)
      const transaction = txs[serializedTxIndex]

      if (
        !transaction ||
        (transaction.status !== TxStatus.Failed && transaction.status !== TxStatus.Confirmed)
      )
        return

      const { actionStatus, toastStatus } =
        transaction.status === TxStatus.Failed
          ? { actionStatus: ActionStatus.Failed, toastStatus: 'error' as const }
          : { actionStatus: ActionStatus.Complete, toastStatus: 'success' as const }

      const newAction = { ...action, status: actionStatus }
      dispatch(actionSlice.actions.upsertAction(newAction))

      toast({
        status: toastStatus,
        render: ({ onClose, ...props }) => (
          <EvergreenDepositNotification
            handleClick={openActionCenter}
            action={newAction}
            onClose={onClose}
            {...props}
          />
        ),
      })
    })
  }, [pendingEvergreenActions, isConnected, dispatch, toast, openActionCenter, txs])
}
