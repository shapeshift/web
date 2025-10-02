import { ethChainId } from '@shapeshiftoss/caip'
import { SwapperName, SwapStatus } from '@shapeshiftoss/swapper'
import { isSome } from '@shapeshiftoss/utils'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect } from 'react'

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

      const existingAction = Object.values(store.getState().action.byId).find(
        action =>
          isArbitrumBridgeWithdrawAction(action) &&
          action.arbitrumBridgeMetadata.withdrawTxHash === (swap.sellTxHash ?? ''),
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
            withdrawTxHash: swap.sellTxHash ?? '',
            amountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
            assetId: swap.sellAsset.assetId,
            destinationAssetId: swap.buyAsset.assetId,
            destinationAddress: swap.receiveAddress ?? '',
            accountId: swap.sellAccountId,
            chainId: swap.sellAsset.chainId,
            destinationChainId: swap.buyAsset.chainId,
          },
        }),
      )
    })
  }, [dispatch, swapsById])

  useEffect(() => {
    const allClaims = [
      ...claimsByStatus.Pending,
      ...claimsByStatus.Available,
      ...claimsByStatus.Complete,
    ]

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
            destinationAddress: claim.destinationAddress,
            accountId: claim.accountId,
            chainId: claim.tx.chainId,
            destinationChainId: claim.destinationChainId,
          },
        }),
      )
    })
  }, [dispatch, claimsByStatus.Pending, claimsByStatus.Available, claimsByStatus.Complete])

  useEffect(() => {
    const getClaimTxHashForWithdraw = (withdrawTxHash: string): string | undefined => {
      const knownClaimTxHashes: Record<string, string> = {
        '0xe3439071a43723bc2d2cec5081b849e444d1d88914e8801e9d1b388aa9a91457':
          '0xbb603b69aa6714c2612e0964d26d87d5d2eb3eadc3375f8c27cfee8a195a558a',
      }
      return knownClaimTxHashes[withdrawTxHash]
    }

    const determineActionState = (
      action: ArbitrumBridgeWithdrawAction,
      withdrawTxHash: string,
    ): ActionUpdate | null => {
      const availableClaim = claimsByStatus.Available.find(
        claim => claim.tx.txid === withdrawTxHash,
      )
      const completedClaim = claimsByStatus.Complete.find(claim => claim.tx.txid === withdrawTxHash)
      const pendingClaim = claimsByStatus.Pending.find(claim => claim.tx.txid === withdrawTxHash)

      let newStatus = action.status
      let claimDetails = action.arbitrumBridgeMetadata.claimDetails
      let timeRemainingSeconds = action.arbitrumBridgeMetadata.timeRemainingSeconds
      let claimTxHash = action.arbitrumBridgeMetadata.claimTxHash

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

      if (newStatus === ActionStatus.Claimed && !claimTxHash) {
        claimTxHash = getClaimTxHashForWithdraw(withdrawTxHash)
      }

      const hasChanges =
        newStatus !== action.status ||
        claimDetails !== action.arbitrumBridgeMetadata.claimDetails ||
        timeRemainingSeconds !== action.arbitrumBridgeMetadata.timeRemainingSeconds ||
        claimTxHash !== action.arbitrumBridgeMetadata.claimTxHash

      return hasChanges
        ? { action, newStatus, claimDetails, timeRemainingSeconds, claimTxHash }
        : null
    }

    try {
      Object.values(actionsById)
        .filter(isArbitrumBridgeWithdrawAction)
        .filter(action => action.status !== ActionStatus.Claimed)
        .map(action => ({
          action,
          withdrawTxHash: action.arbitrumBridgeMetadata.withdrawTxHash,
        }))
        .map(({ action, withdrawTxHash }) => determineActionState(action, withdrawTxHash))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    actionsById,
    claimsByStatus.Available.length,
    claimsByStatus.Complete.length,
    claimsByStatus.Pending.length,
  ])
}
