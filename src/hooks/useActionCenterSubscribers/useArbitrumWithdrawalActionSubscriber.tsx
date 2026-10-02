import { usePrevious } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { isSome } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Hash } from 'viem'
import { TransactionNotFoundError, TransactionReceiptNotFoundError } from 'viem'

import { useNotificationToast } from '../useNotificationToast'
import {
  buildArbitrumBridgeWithdrawActionFromClaim,
  getArbitrumBridgeWithdrawActionId,
} from './arbitrumBridgeWithdrawAction'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { useArbitrumClaims } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, isClaimStatusRegression } from '@/state/slices/actionSlice/types'
import { selectPendingArbitrumBridgeWithdrawActions } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

// A node can briefly miss a fresh broadcast, so only a long-unknown claim counts as dropped
const CLAIM_TX_DROPPED_AFTER_MS = 10 * 60 * 1000

const getClaimTxStatus = async (claimTxHash: Hash, broadcastAt: number): Promise<TxStatus> => {
  const client = assertGetViemClient(ethChainId)

  try {
    const { status } = await client.getTransactionReceipt({ hash: claimTxHash })
    return status === 'success' ? TxStatus.Confirmed : TxStatus.Failed
  } catch (error) {
    if (!(error instanceof TransactionReceiptNotFoundError)) throw error
  }

  try {
    await client.getTransaction({ hash: claimTxHash })
    return TxStatus.Pending
  } catch (error) {
    if (!(error instanceof TransactionNotFoundError)) throw error
    return Date.now() - broadcastAt > CLAIM_TX_DROPPED_AFTER_MS ? TxStatus.Failed : TxStatus.Pending
  }
}

const selectClaimTxStatuses = (results: { data?: TxStatus }[]) => results.map(({ data }) => data)

export const useArbitrumWithdrawalActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const { claims, claimsByTxid } = useArbitrumClaims()
  const translate = useTranslate()

  const { isDrawerOpen, openActionCenterClaims } = useActionCenterContext()
  const toastOptions = useMemo(() => ({ duration: isDrawerOpen ? 5000 : null }), [isDrawerOpen])
  const toast = useNotificationToast(toastOptions)
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  const notifyClaimAvailable = useCallback(
    (actionId: string) => {
      if (toast.isActive(actionId)) return

      toast({
        id: actionId,
        status: 'success',
        title: translate('bridge.bridgeWithdrawalReadyNotification'),
        description: translate('bridge.checkActionCenterNotification'),
        position: 'bottom-right',
        onClick: () => {
          toast.close(actionId)
          openActionCenterClaims()
        },
      })
    },
    [openActionCenterClaims, toast, translate],
  )

  // Recover missing withdraw actions from tx history, e.g. after a wiped store or an outside withdrawal
  useEffect(() => {
    claims.forEach(claim => {
      if (claim.status === ActionStatus.Claimed) return
      if (actionsById[getArbitrumBridgeWithdrawActionId(claim.withdrawTxHash)]) return

      dispatch(actionSlice.actions.upsertAction(buildArbitrumBridgeWithdrawActionFromClaim(claim)))
    })
  }, [dispatch, actionsById, claims])

  // Claimed is final, nothing below reads or writes it again
  const pendingArbitrumBridgeActions = useAppSelector(selectPendingArbitrumBridgeWithdrawActions)

  useEffect(() => {
    try {
      pendingArbitrumBridgeActions
        .map(action => {
          const claim = claimsByTxid[action.arbitrumBridgeMetadata.withdrawTxHash]
          if (!claim) return null

          const newStatus = claim.status

          // A lagging rpc or a claim in flight reads as an earlier status, a withdraw never moves backwards
          if (isClaimStatusRegression(action.status, newStatus)) return null

          // Only a pending claim's estimate still matters
          const claimableAt =
            newStatus === ActionStatus.Initiated
              ? claim.claimableAt
              : action.arbitrumBridgeMetadata.claimableAt

          // Every upsert bumps updatedAt and re-fires this effect, an unchanged write loops it (#10556)
          const hasChanges =
            newStatus !== action.status || claimableAt !== action.arbitrumBridgeMetadata.claimableAt

          return hasChanges ? { action, newStatus, claimableAt } : null
        })
        .filter(isSome)
        .forEach(update => {
          const previousStatus = update.action.status
          const newStatus = update.newStatus

          dispatch(
            actionSlice.actions.upsertAction({
              ...update.action,
              updatedAt: Date.now(),
              status: update.newStatus,
              arbitrumBridgeMetadata: {
                ...update.action.arbitrumBridgeMetadata,
                claimableAt: update.claimableAt,
              },
            }),
          )

          if (previousStatus !== newStatus && newStatus === ActionStatus.ClaimAvailable) {
            notifyClaimAvailable(update.action.id)
          }
        })
    } catch (error) {
      console.error('Error updating ArbitrumBridge action statuses:', error)
    }
  }, [dispatch, notifyClaimAvailable, pendingArbitrumBridgeActions, claimsByTxid])

  // Resolves in-flight claims, including ones broadcast before a reload
  const claimingActions = useMemo(
    () =>
      pendingArbitrumBridgeActions.filter(
        action =>
          action.status === ActionStatus.Pending &&
          Boolean(action.arbitrumBridgeMetadata.claimTxHash),
      ),
    [pendingArbitrumBridgeActions],
  )

  const claimTxStatuses = useQueries({
    queries: claimingActions.map(action => {
      const claimTxHash = action.arbitrumBridgeMetadata.claimTxHash as Hash

      return {
        queryKey: ['arbitrumClaimTxStatus', { claimTxHash }],
        // updatedAt is the broadcast time, a claiming action isn't written again until it resolves
        queryFn: () => getClaimTxStatus(claimTxHash, action.updatedAt),
        refetchInterval: 15_000,
      }
    }),
    combine: selectClaimTxStatuses,
  })

  useEffect(() => {
    claimingActions.forEach((action, i) => {
      switch (claimTxStatuses[i]) {
        case TxStatus.Confirmed:
          dispatch(actionSlice.actions.upsertAction({ ...action, status: ActionStatus.Claimed }))
          return
        case TxStatus.Failed:
          dispatch(
            actionSlice.actions.upsertAction({
              ...action,
              status: ActionStatus.ClaimAvailable,
              arbitrumBridgeMetadata: { ...action.arbitrumBridgeMetadata, claimTxHash: undefined },
            }),
          )
          return
        default:
          return
      }
    })
  }, [dispatch, claimingActions, claimTxStatuses])
}
