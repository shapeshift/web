import { usePrevious } from '@chakra-ui/react'
import { isSome } from '@shapeshiftoss/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useNotificationToast } from '../useNotificationToast'
import { useArbitrumBridgeTransactionHistorySubscriber } from './useArbitrumBridgeTransactionHistorySubscriber'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { useArbitrumClaimsByStatus } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, isArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useArbitrumBridgeActionSubscriber = () => {
  // Use transaction history subscriber to detect and create initial actions from historical withdrawals
  // TODO: Remove this in next PR when claim tab is removed - this replaces "poor man's migration"
  useArbitrumBridgeTransactionHistorySubscriber()

  const dispatch = useAppDispatch()
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const { claimsByStatus } = useArbitrumClaimsByStatus()
  const translate = useTranslate()

  const { isDrawerOpen } = useActionCenterContext()
  const toastOptions = useMemo(() => ({ duration: isDrawerOpen ? 5000 : null }), [isDrawerOpen])
  const toast = useNotificationToast(toastOptions)
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  const pendingArbitrumBridgeActions = useMemo(() => {
    return Object.values(actionsById)
      .filter(isArbitrumBridgeWithdrawAction)
      .filter(action => {
        // Early bailout: if action is already in terminal state, don't process
        // i.e see this bad boi https://github.com/shapeshift/web/pull/10556
        if (action.status === ActionStatus.Claimed || action.status === ActionStatus.Failed) {
          return false
        }
        return true
      })
  }, [actionsById])

  useEffect(() => {
    try {
      pendingArbitrumBridgeActions
        .map(action => {
          const withdrawTxHash = action.arbitrumBridgeMetadata.withdrawTxHash

          // Find claims by transaction hash
          const availableClaim = claimsByStatus.Available.find(
            claim => claim.tx.txid === withdrawTxHash,
          )
          const completedClaim = claimsByStatus.Complete.find(
            claim => claim.tx.txid === withdrawTxHash,
          )
          const pendingClaim = claimsByStatus.Pending.find(
            claim => claim.tx.txid === withdrawTxHash,
          )

          const currentMetadata = action.arbitrumBridgeMetadata

          // Determine new action state from claim data
          const newState = (() => {
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

            // No changes - return current state
            return {
              newStatus: action.status,
              claimDetails: currentMetadata.claimDetails,
              timeRemainingSeconds: currentMetadata.timeRemainingSeconds,
              claimTxHash: currentMetadata.claimTxHash,
            }
          })()

          // Check if action state changed - use deep comparison for objects
          // once again, paranoia against this bad boi https://github.com/shapeshift/web/pull/10556

          const hasChanges =
            newState.newStatus !== action.status ||
            JSON.stringify(newState.claimDetails) !==
              JSON.stringify(currentMetadata.claimDetails) ||
            newState.timeRemainingSeconds !== currentMetadata.timeRemainingSeconds ||
            newState.claimTxHash !== currentMetadata.claimTxHash

          return hasChanges ? { action, ...newState } : null
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
                claimDetails: update.claimDetails,
                timeRemainingSeconds: update.timeRemainingSeconds,
                claimTxHash: update.claimTxHash ?? update.action.arbitrumBridgeMetadata.claimTxHash,
              },
            }),
          )

          // Show notification when status changes to ClaimAvailable
          if (previousStatus !== newStatus && newStatus === ActionStatus.ClaimAvailable) {
            if (!toast.isActive(update.action.id)) {
              toast({
                status: 'success',
                title: translate('bridge.bridgeWithdrawalReadyNotification'),
                description: translate('bridge.checkActionCenterNotification'),
                position: 'bottom-right',
              })
            }
          }
        })
    } catch (error) {
      console.error('Error updating ArbitrumBridge action statuses:', error)
    }
    // claimsByStatus arrays are recreated on every render, use length for stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    toast,
    translate,
    pendingArbitrumBridgeActions,
    claimsByStatus.Available.length,
    claimsByStatus.Complete.length,
    claimsByStatus.Pending.length,
  ])
}
