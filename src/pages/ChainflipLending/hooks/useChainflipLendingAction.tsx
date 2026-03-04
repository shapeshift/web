import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback } from 'react'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { ChainflipLendingNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/ChainflipLendingNotification'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { vibrate } from '@/lib/vibrate'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ChainflipLendingOperationType } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  isChainflipLendingAction,
} from '@/state/slices/actionSlice/types'
import { store, useAppDispatch } from '@/state/store'

type CreateLendingActionArgs = {
  operationType: ChainflipLendingOperationType
  amountCryptoPrecision: string
  assetId: AssetId
  accountId: AccountId
}

export const useChainflipLendingAction = () => {
  const dispatch = useAppDispatch()
  const toast = useNotificationToast()
  const { openActionCenter, isDrawerOpen } = useActionCenterContext()

  const createAction = useCallback(
    (args: CreateLendingActionArgs) => {
      const { operationType, amountCryptoPrecision, assetId, accountId } = args
      const id = uuidv4()
      const now = Date.now()

      const messageKey = `actionCenter.chainflipLending.${operationType}.pending`

      dispatch(
        actionSlice.actions.upsertAction({
          id,
          type: ActionType.ChainflipLending,
          status: ActionStatus.Pending,
          createdAt: now,
          updatedAt: now,
          chainflipLendingMetadata: {
            operationType,
            amountCryptoPrecision,
            assetId,
            accountId,
            message: messageKey,
          },
        }),
      )

      return id
    },
    [dispatch],
  )

  const completeAction = useCallback(
    (actionId: string, txHash?: string, egressTxRef?: string) => {
      vibrate('heavy')

      const state = store.getState()
      const action = state.action.byId[actionId]
      if (!action || !isChainflipLendingAction(action)) return

      const { operationType } = action.chainflipLendingMetadata
      const messageKey = `actionCenter.chainflipLending.${operationType}.complete`

      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Complete,
          updatedAt: Date.now(),
          chainflipLendingMetadata: {
            ...action.chainflipLendingMetadata,
            message: messageKey,
            txHash,
            egressTxRef,
          },
        }),
      )

      if (!toast.isActive(actionId)) {
        toast({
          id: actionId,
          duration: isDrawerOpen ? 5000 : null,
          status: 'success',
          render: ({ onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <ChainflipLendingNotification
                handleClick={handleClick}
                actionId={actionId}
                onClose={onClose}
                {...props}
              />
            )
          },
        })
      }
    },
    [dispatch, toast, isDrawerOpen, openActionCenter],
  )

  const failAction = useCallback(
    (actionId: string) => {
      const state = store.getState()
      const action = state.action.byId[actionId]
      if (!action || !isChainflipLendingAction(action)) return

      const { operationType } = action.chainflipLendingMetadata
      const messageKey = `actionCenter.chainflipLending.${operationType}.failed`

      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Failed,
          updatedAt: Date.now(),
          chainflipLendingMetadata: {
            ...action.chainflipLendingMetadata,
            message: messageKey,
          },
        }),
      )

      if (!toast.isActive(actionId)) {
        toast({
          id: actionId,
          duration: 5000,
          status: 'error',
          render: ({ onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <ChainflipLendingNotification
                handleClick={handleClick}
                actionId={actionId}
                onClose={onClose}
                {...props}
              />
            )
          },
        })
      }
    },
    [dispatch, toast, openActionCenter],
  )

  return { createAction, completeAction, failAction }
}
