import { ethChainId, toAccountId } from '@shapeshiftoss/caip'
import { SwapperName, SwapStatus } from '@shapeshiftoss/swapper'
import { isSome } from '@shapeshiftoss/utils'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect } from 'react'

import type { ClaimDetails } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimsByStatus } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  isArbitrumBridgeWithdrawAction,
} from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type ActionUpdate = {
  action: ArbitrumBridgeWithdrawAction
  newStatus: ActionStatus
  claimDetails?: ClaimDetails
  timeRemainingSeconds?: number
  claimTxHash?: string
}

export const useArbitrumBridgeActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const { claimsByStatus } = useArbitrumClaimsByStatus()

  useEffect(() => {
    Object.values(swapsById).forEach(swap => {
      if (!swap) return

      if (
        swap.swapperName !== SwapperName.ArbitrumBridge ||
        swap.buyAsset.chainId !== ethChainId ||
        swap.status !== SwapStatus.Success
      ) {
        return
      }

      if (!swap.sellTxHash) return

      const existingAction = Object.values(store.getState().action.byId).find(
        action =>
          isArbitrumBridgeWithdrawAction(action) &&
          action.arbitrumBridgeMetadata.withdrawTxHash === swap.sellTxHash,
      )

      if (existingAction) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          createdAt: swap.createdAt,
          updatedAt: swap.updatedAt,
          type: ActionType.ArbitrumBridgeWithdraw,
          status: ActionStatus.Initiated,
          arbitrumBridgeMetadata: {
            withdrawTxHash: swap.sellTxHash,
            amountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
            assetId: swap.sellAsset.assetId,
            destinationAssetId: swap.buyAsset.assetId,
            accountId: swap.sellAccountId,
            destinationAccountId: toAccountId({
              chainId: swap.buyAsset.chainId,
              account: swap.receiveAddress ?? '',
            }),
          },
        }),
      )
    })
  }, [dispatch, swapsById])

  useEffect(() => {
    const allClaims = [...claimsByStatus.Pending, ...claimsByStatus.Available]

    allClaims.forEach(claim => {
      const withdrawTxHash = claim.tx.txid

      const existingAction = Object.values(store.getState().action.byId).find(
        action =>
          isArbitrumBridgeWithdrawAction(action) &&
          action.arbitrumBridgeMetadata.withdrawTxHash === withdrawTxHash,
      )

      if (existingAction) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          createdAt: claim.tx.blockTime * 1000,
          updatedAt: Date.now(),
          type: ActionType.ArbitrumBridgeWithdraw,
          status: ActionStatus.Initiated,
          arbitrumBridgeMetadata: {
            withdrawTxHash,
            amountCryptoBaseUnit: claim.amountCryptoBaseUnit,
            assetId: claim.assetId,
            destinationAssetId: claim.destinationAssetId,
            accountId: claim.accountId,
            destinationAccountId: toAccountId({
              chainId: claim.destinationChainId,
              account: claim.destinationAddress,
            }),
          },
        }),
      )
    })
  }, [dispatch, claimsByStatus.Pending, claimsByStatus.Available])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // claimsByStatus arrays are recreated on every render, use length for stable references
    [claimsByStatus.Available.length, claimsByStatus.Complete.length, claimsByStatus.Pending.length],
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
        })
    } catch (error) {
      console.error('Error updating ArbitrumBridge action statuses:', error)
    }
  }, [dispatch, actionsById, determineActionState])
}
