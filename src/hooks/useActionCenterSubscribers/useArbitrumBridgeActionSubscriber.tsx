import { usePrevious } from '@chakra-ui/react'
import { isSome } from '@shapeshiftoss/utils'
import { useCallback, useEffect } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import type { ClaimDetails } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, isArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ActionUpdate = {
  action: ArbitrumBridgeWithdrawAction
  newStatus: ActionStatus
  claimDetails?: ClaimDetails
  timeRemainingSeconds?: number
  claimTxHash?: string
}

export const useArbitrumBridgeActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const { claimsByStatus } = useArbitrumClaimsByStatus()

  const { isDrawerOpen } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  const showNotification = useCallback(
    (actionId: string, status: 'success' | 'error') => {
      if (toast.isActive(actionId)) return

      toast({
        status,
        title:
          status === 'success' ? 'Bridge withdrawal ready to claim' : 'Bridge withdrawal failed',
        description: 'Check Action Center for details',
        position: 'bottom-right',
      })
    },
    [toast],
  )

  const determineActionState = useCallback(
    (action: ArbitrumBridgeWithdrawAction, withdrawTxHash: string): ActionUpdate | null => {
      const availableClaim = claimsByStatus.Available.find(
        claim => claim.tx.txid === withdrawTxHash,
      )
      const completedClaim = claimsByStatus.Complete.find(claim => claim.tx.txid === withdrawTxHash)
      const pendingClaim = claimsByStatus.Pending.find(claim => claim.tx.txid === withdrawTxHash)

      const currentMetadata = action.arbitrumBridgeMetadata

      const getNewState = () => {
        if (completedClaim) {
          return {
            newStatus: ActionStatus.Claimed,
            claimDetails: completedClaim,
            timeRemainingSeconds: currentMetadata.timeRemainingSeconds,
            claimTxHash: currentMetadata.claimTxHash,
          }
        }

        if (availableClaim) {
          return {
            newStatus: ActionStatus.ClaimAvailable,
            claimDetails: availableClaim,
            timeRemainingSeconds: availableClaim.timeRemainingSeconds,
            claimTxHash: currentMetadata.claimTxHash,
          }
        }

        if (pendingClaim) {
          return {
            newStatus: ActionStatus.Initiated,
            claimDetails: pendingClaim,
            timeRemainingSeconds: pendingClaim.timeRemainingSeconds,
            claimTxHash: currentMetadata.claimTxHash,
          }
        }

        return {
          newStatus: action.status,
          claimDetails: currentMetadata.claimDetails,
          timeRemainingSeconds: currentMetadata.timeRemainingSeconds,
          claimTxHash: currentMetadata.claimTxHash,
        }
      }

      const newState = getNewState()

      const hasChanges =
        newState.newStatus !== action.status ||
        newState.claimDetails !== currentMetadata.claimDetails ||
        newState.timeRemainingSeconds !== currentMetadata.timeRemainingSeconds ||
        newState.claimTxHash !== currentMetadata.claimTxHash

      return hasChanges ? { action, ...newState } : null
    },
    // claimsByStatus arrays are recreated on every render, use length for stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      claimsByStatus.Available.length,
      claimsByStatus.Complete.length,
      claimsByStatus.Pending.length,
    ],
  )

  useEffect(() => {
    try {
      Object.values(actionsById)
        .filter(isArbitrumBridgeWithdrawAction)
        .filter(action => {
          // Early bailout: if action is already in terminal state, don't process
          if (action.status === ActionStatus.Claimed || action.status === ActionStatus.Failed) {
            return false
          }
          return true
        })
        .map(action => determineActionState(action, action.arbitrumBridgeMetadata.withdrawTxHash))
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
                claimDetails: update.claimDetails,
                timeRemainingSeconds: update.timeRemainingSeconds,
                claimTxHash: update.claimTxHash ?? update.action.arbitrumBridgeMetadata.claimTxHash,
              },
            }),
          )

          // Show notification only for ClaimAvailable status (not for Claimed)
          if (previousStatus !== newStatus) {
            console.log('🟡 ArbitrumBridge action status changed:', {
              actionId: update.action.id,
              previousStatus,
              newStatus,
              withdrawTxHash: update.action.arbitrumBridgeMetadata.withdrawTxHash,
            })
            if (newStatus === ActionStatus.ClaimAvailable) {
              showNotification(update.action.id, 'success')
            }
          }
        })
    } catch (error) {
      console.error('Error updating ArbitrumBridge action statuses:', error)
    }
  }, [dispatch, actionsById, determineActionState, showNotification])
}
