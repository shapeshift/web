import { usePrevious } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { isSome } from '@shapeshiftoss/utils'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useNotificationToast } from '../useNotificationToast'
import { useArbitrumClaimStatus } from './useArbitrumClaimStatus'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  isArbitrumBridgeWithdrawAction,
  isSwapAction,
} from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useArbitrumBridgeActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  // Get transaction hashes from pending ArbitrumBridge actions
  const arbitrumBridgeActions = useMemo(() => {
    return Object.values(actionsById).filter(isArbitrumBridgeWithdrawAction)
  }, [actionsById])

  const txHashes = useMemo(() => {
    return arbitrumBridgeActions.map(action => action.arbitrumBridgeMetadata.withdrawTxHash)
  }, [arbitrumBridgeActions])

  const { claimsByTxHash } = useArbitrumClaimStatus(txHashes)
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

  // Create ArbitrumBridge withdraw actions from completed swap actions
  useEffect(() => {
    Object.values(actionsById)
      .filter(isSwapAction)
      .filter(action => action.status === ActionStatus.Complete)
      .forEach(swapAction => {
        const swap = swapsById[swapAction.swapMetadata.swapId]
        if (
          !swap?.sellTxHash ||
          swap.swapperName !== SwapperName.ArbitrumBridge ||
          swap.buyAsset.chainId !== ethChainId
        )
          return

        // Check if ArbitrumBridge withdraw action already exists
        // i.e see this bad boi https://github.com/shapeshift/web/pull/10556
        const existingAction = Object.values(actionsById).find(
          action =>
            action.type === ActionType.ArbitrumBridgeWithdraw &&
            action.arbitrumBridgeMetadata?.withdrawTxHash === swap.sellTxHash,
        )
        if (existingAction) return

        // Get real-time ETA from claims hook - bail if no claim data available
        const claimData = claimsByTxHash[swap.sellTxHash]
        if (!claimData) return

        dispatch(
          actionSlice.actions.upsertAction({
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            type: ActionType.ArbitrumBridgeWithdraw as const,
            status: ActionStatus.Initiated,
            arbitrumBridgeMetadata: {
              withdrawTxHash: swap.sellTxHash,
              amountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
              assetId: swap.sellAsset.assetId,
              destinationAssetId: swap.buyAsset.assetId,
              accountId: swap.sellAccountId ?? '',
              destinationAccountId: swap.buyAccountId ?? '',
              timeRemainingSeconds: claimData.timeRemainingSeconds ?? 6.4 * 24 * 60 * 60,
            },
          }),
        )
      })
  }, [actionsById, swapsById, dispatch, claimsByTxHash])

  const pendingArbitrumBridgeActions = useMemo(() => {
    return Object.values(actionsById)
      .filter(isArbitrumBridgeWithdrawAction)
      .filter(action => {
        // Early bailout: if action is already in terminal state, don't process
        // once again, paranoia against this bad boi https://github.com/shapeshift/web/pull/10556
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

          // Get claim data by transaction hash
          const claimData = claimsByTxHash[withdrawTxHash]

          const currentMetadata = action.arbitrumBridgeMetadata

          // Determine new action state from claim data
          const newState = (() => {
            if (!claimData) {
              // No claim data - return current state
              return {
                newStatus: action.status,
                timeRemainingSeconds: currentMetadata.timeRemainingSeconds,
                claimTxHash: currentMetadata.claimTxHash,
              }
            }

            if (claimData.claimStatus === 'Complete') {
              return {
                newStatus: ActionStatus.Claimed,
                timeRemainingSeconds: claimData.timeRemainingSeconds,
                claimTxHash: currentMetadata.claimTxHash,
              }
            }

            if (claimData.claimStatus === 'Available') {
              return {
                newStatus: ActionStatus.ClaimAvailable,
                timeRemainingSeconds: claimData.timeRemainingSeconds,
                claimTxHash: currentMetadata.claimTxHash,
              }
            }

            if (claimData.claimStatus === 'Pending') {
              return {
                newStatus: ActionStatus.Initiated,
                timeRemainingSeconds: claimData.timeRemainingSeconds,
                claimTxHash: currentMetadata.claimTxHash,
              }
            }

            // Fallback - return current state
            return {
              newStatus: action.status,
              timeRemainingSeconds: currentMetadata.timeRemainingSeconds,
              claimTxHash: currentMetadata.claimTxHash,
            }
          })()

          // Check if action state changed
          const hasChanges =
            newState.newStatus !== action.status ||
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
  }, [dispatch, toast, translate, pendingArbitrumBridgeActions, claimsByTxHash])
}
