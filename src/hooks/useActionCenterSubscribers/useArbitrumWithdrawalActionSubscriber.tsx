import { usePrevious } from '@chakra-ui/react'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { isSome } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useNotificationToast } from '../useNotificationToast'
import {
  buildArbitrumBridgeWithdrawActionFromClaim,
  getArbitrumBridgeWithdrawActionId,
} from './arbitrumBridgeWithdrawAction'

import { ClaimStatus } from '@/components/ClaimRow/types'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { useArbitrumClaimsByStatus } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  isArbitrumBridgeWithdrawAction,
  isSwapAction,
} from '@/state/slices/actionSlice/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useArbitrumWithdrawalActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const { claimsByStatus } = useArbitrumClaimsByStatus()
  const translate = useTranslate()

  const ethAccountIds = useMemo(
    () =>
      enabledWalletAccountIds.filter(accountId => fromAccountId(accountId).chainId === ethChainId),
    [enabledWalletAccountIds],
  )

  const arbitrumActionsByWithdrawTxHash = useMemo(
    () =>
      Object.values(actionsById)
        .filter(isArbitrumBridgeWithdrawAction)
        .reduce<Record<string, ArbitrumBridgeWithdrawAction>>((acc, action) => {
          acc[action.arbitrumBridgeMetadata.withdrawTxHash] = action
          return acc
        }, {}),
    [actionsById],
  )

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
    const allClaims = [
      ...claimsByStatus.Pending,
      ...claimsByStatus.Available,
      ...claimsByStatus.Complete,
    ]

    Object.values(actionsById)
      .filter(isSwapAction)
      .filter(action => action.status === ActionStatus.Initiated)
      .forEach(swapAction => {
        const swap = swapsById[swapAction.swapMetadata.swapId]
        if (
          !swap?.sellTxHash ||
          swap.swapperName !== SwapperName.ArbitrumBridge ||
          swap.buyAsset.chainId !== ethChainId
        )
          return

        // i.e see this bad boi https://github.com/shapeshift/web/pull/10556
        if (arbitrumActionsByWithdrawTxHash[swap.sellTxHash]) return

        // Get real-time ETA from claims hook - use fallback if not available yet
        // Chicken and egg: we need an ETA to upsert the action, but we need an action to check the ETA
        const claimDetails = allClaims.find(claim => claim.tx.txid === swap.sellTxHash)

        dispatch(
          actionSlice.actions.upsertAction({
            id: getArbitrumBridgeWithdrawActionId(swap.sellTxHash),
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
              timeRemainingSeconds: claimDetails?.timeRemainingSeconds ?? 6.4 * 24 * 60 * 60,
              claimDetails,
            },
          }),
        )
      })
  }, [actionsById, swapsById, dispatch, claimsByStatus, arbitrumActionsByWithdrawTxHash])

  const notifyClaimAvailable = useCallback(
    (actionId: string) => {
      if (toast.isActive(actionId)) return

      toast({
        id: actionId,
        status: 'success',
        title: translate('bridge.bridgeWithdrawalReadyNotification'),
        description: translate('bridge.checkActionCenterNotification'),
        position: 'bottom-right',
      })
    },
    [toast, translate],
  )

  // Recreate withdraw actions from the claims tx history knows about, so a wiped store, another browser,
  // or a withdrawal made outside the app still surfaces here. Completed claims have nothing left to do.
  useEffect(() => {
    if (!ethAccountIds.length) return

    const claims = [
      ...claimsByStatus.Pending.map(claim => ({ claim, claimStatus: ClaimStatus.Pending })),
      ...claimsByStatus.Available.map(claim => ({ claim, claimStatus: ClaimStatus.Available })),
    ]

    claims.forEach(({ claim, claimStatus }) => {
      const existingAction = arbitrumActionsByWithdrawTxHash[claim.tx.txid]

      if (existingAction) {
        // Swap-created actions predating the wallet filter may carry an empty account
        if (existingAction.arbitrumBridgeMetadata.accountId) return

        dispatch(
          actionSlice.actions.upsertAction({
            ...existingAction,
            arbitrumBridgeMetadata: {
              ...existingAction.arbitrumBridgeMetadata,
              accountId: claim.accountId,
            },
          }),
        )
        return
      }

      const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, claimStatus, ethAccountIds)
      if (!action) return

      dispatch(actionSlice.actions.upsertAction(action))

      if (action.status === ActionStatus.ClaimAvailable) notifyClaimAvailable(action.id)
    })
    // claimsByStatus arrays are recreated on every render, use length for stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    ethAccountIds,
    arbitrumActionsByWithdrawTxHash,
    notifyClaimAvailable,
    claimsByStatus.Pending.length,
    claimsByStatus.Available.length,
  ])

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

          if (previousStatus !== newStatus && newStatus === ActionStatus.ClaimAvailable) {
            notifyClaimAvailable(update.action.id)
          }
        })
    } catch (error) {
      console.error('Error updating ArbitrumBridge action statuses:', error)
    }
    // claimsByStatus arrays are recreated on every render, use length for stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    notifyClaimAvailable,
    pendingArbitrumBridgeActions,
    claimsByStatus.Available.length,
    claimsByStatus.Complete.length,
    claimsByStatus.Pending.length,
  ])
}
