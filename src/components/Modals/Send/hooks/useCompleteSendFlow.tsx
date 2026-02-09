import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectInternalAccountIdByAddress } from '@/state/slices/addressBookSlice/selectors'
import { store, useAppDispatch } from '@/state/store'

type CompleteSendFlowArgs = {
  txHash: string
  to: string
  accountId: AccountId
  assetId: AssetId
  amountCryptoPrecision: string
}

export const useCompleteSendFlow = (handleClose: () => void) => {
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  return useCallback(
    ({ txHash, to, accountId, assetId, amountCryptoPrecision }: CompleteSendFlowArgs) => {
      const { chainId, chainNamespace } = fromAccountId(accountId)

      const internalReceiveAccountId =
        chainNamespace === CHAIN_NAMESPACE.Evm
          ? toAccountId({ chainId, account: to })
          : selectInternalAccountIdByAddress(store.getState(), {
              accountAddress: to,
              chainId,
            })

      const accountIdsToRefetch = [accountId]

      if (internalReceiveAccountId) {
        accountIdsToRefetch.push(internalReceiveAccountId)
      }

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Send,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.SEND,
            txHash,
            chainId,
            accountId,
            accountIdsToRefetch,
            assetId,
            amountCryptoPrecision,
            message: 'modals.send.status.pendingBody',
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      handleClose()
    },
    [dispatch, handleClose, isDrawerOpen, openActionCenter, toast],
  )
}
