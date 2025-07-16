import { usePrevious } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { GenericTransactionNotification } from './GenericTransactionNotification'

import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectWalletActionsSorted } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, isGenericTransactionAction } from '@/state/slices/actionSlice/types'
import { useAppSelector } from '@/state/store'

export type GenericTransactionNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

export const SendNotification = ({
  handleClick,
  actionId,
  onClose,
}: GenericTransactionNotificationProps) => {
  const dispatch = useDispatch()
  const actions = useAppSelector(selectWalletActionsSorted)
  const action = useMemo(
    () => actions.filter(isGenericTransactionAction).find(a => a.id === actionId),
    [actions, actionId],
  )

  const transactionMetadata = useMemo(
    () => action?.transactionMetadata,
    [action?.transactionMetadata],
  )

  const txStatus = useTxStatus({
    accountId: transactionMetadata?.accountId ?? null,
    txHash: transactionMetadata?.txHash ?? null,
  })
  const prevTxStatus = usePrevious(txStatus)

  useEffect(() => {
    if (!action) return
    if (!transactionMetadata) return
    if (!txStatus || txStatus === prevTxStatus) return

    // This may have already been upserted from the poller, ensure we don't overwrite it
    if (action.status === ActionStatus.Complete) return

    if ((!prevTxStatus || prevTxStatus === TxStatus.Pending) && txStatus === TxStatus.Confirmed) {
      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Complete,
          updatedAt: Date.now(),
          transactionMetadata: {
            ...transactionMetadata,
            message: 'modals.send.youHaveSent',
          },
        }),
      )
    }
  }, [action, txStatus, prevTxStatus, dispatch, transactionMetadata])

  return (
    <GenericTransactionNotification
      handleClick={handleClick}
      actionId={actionId}
      onClose={onClose}
    />
  )
}
