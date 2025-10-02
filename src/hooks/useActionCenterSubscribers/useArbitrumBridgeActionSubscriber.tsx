import { ethChainId } from '@shapeshiftoss/caip'
import { SwapperName, SwapStatus } from '@shapeshiftoss/swapper'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect } from 'react'

import { useArbitrumClaimsByStatus } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  isArbitrumBridgeWithdrawAction,
} from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useArbitrumBridgeActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const { claimsByStatus } = useArbitrumClaimsByStatus()

  // Create bridge actions for completed ArbitrumBridge withdraws
  useEffect(() => {
    Object.values(swapsById).forEach(swap => {
      if (!swap) return

      // Only handle ArbitrumBridge withdraws (to ETH mainnet)
      if (
        swap.swapperName !== SwapperName.ArbitrumBridge ||
        swap.buyAsset.chainId !== ethChainId ||
        swap.status !== SwapStatus.Success
      ) {
        return
      }

      // Check if we already have an action for this swap
      const existingAction = Object.values(store.getState().action.byId).find(
        action =>
          isArbitrumBridgeWithdrawAction(action) &&
          action.arbitrumBridgeMetadata.withdrawTxHash === (swap.sellTxHash || ''),
      )

      if (existingAction) return

      // Create ArbitrumBridge withdraw action
      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          createdAt: swap.createdAt,
          updatedAt: swap.updatedAt,
          type: ActionType.ArbitrumBridgeWithdraw,
          status: ActionStatus.Initiated,
          arbitrumBridgeMetadata: {
            withdrawTxHash: swap.sellTxHash || '',
            amountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
            assetId: swap.sellAsset.assetId,
            destinationAssetId: swap.buyAsset.assetId,
            destinationAddress: swap.receiveAddress || '',
            accountId: swap.sellAccountId,
            chainId: swap.sellAsset.chainId,
            destinationChainId: swap.buyAsset.chainId,
          },
        }),
      )
    })
  }, [dispatch, swapsById])

  // Update bridge action statuses based on claim availability
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      const allBridgeActions = Object.values(store.getState().action.byId).filter(
        isArbitrumBridgeWithdrawAction,
      )

      // Batch updates to avoid excessive dispatches
      const updates: {
        action: any
        newStatus: ActionStatus
        claimDetails?: any
        timeRemainingSeconds?: number
      }[] = []

      allBridgeActions.forEach(action => {
        const withdrawTxHash = action.arbitrumBridgeMetadata.withdrawTxHash

        // Find corresponding claim details
        const availableClaim = claimsByStatus.Available.find(
          claim => claim.tx.txid === withdrawTxHash,
        )
        const completedClaim = claimsByStatus.Complete.find(
          claim => claim.tx.txid === withdrawTxHash,
        )
        const pendingClaim = claimsByStatus.Pending.find(claim => claim.tx.txid === withdrawTxHash)

        let newStatus = action.status
        let claimDetails = action.arbitrumBridgeMetadata.claimDetails
        let timeRemainingSeconds = action.arbitrumBridgeMetadata.timeRemainingSeconds

        if (completedClaim) {
          newStatus = ActionStatus.Claimed
          claimDetails = completedClaim
        } else if (availableClaim) {
          newStatus = ActionStatus.ClaimAvailable
          claimDetails = availableClaim
          timeRemainingSeconds = availableClaim.timeRemainingSeconds
        } else if (pendingClaim) {
          newStatus = ActionStatus.Initiated
          claimDetails = pendingClaim
          timeRemainingSeconds = pendingClaim.timeRemainingSeconds
        }

        // Queue update if status or details changed
        if (
          newStatus !== action.status ||
          claimDetails !== action.arbitrumBridgeMetadata.claimDetails ||
          timeRemainingSeconds !== action.arbitrumBridgeMetadata.timeRemainingSeconds
        ) {
          updates.push({ action, newStatus, claimDetails, timeRemainingSeconds })
        }
      })

      // Batch dispatch updates
      updates.forEach(({ action, newStatus, claimDetails, timeRemainingSeconds }) => {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            updatedAt: Date.now(),
            status: newStatus,
            arbitrumBridgeMetadata: {
              ...action.arbitrumBridgeMetadata,
              claimDetails,
              timeRemainingSeconds,
            },
          }),
        )
      })
    } catch (error) {
      console.error('Error updating ArbitrumBridge action statuses:', error)
    }
    // Note: Using .length instead of full arrays to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    claimsByStatus.Available.length,
    claimsByStatus.Complete.length,
    claimsByStatus.Pending.length,
  ])
}
