import { usePrevious } from '@chakra-ui/react'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { SwapperName, SwapStatus } from '@shapeshiftoss/swapper'
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

import { ClaimStatus } from '@/components/ClaimRow/types'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import {
  getArbitrumClaimableAt,
  useArbitrumClaimsByStatus,
} from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
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

  const { isDrawerOpen, openActionCenterClaims } = useActionCenterContext()
  const toastOptions = useMemo(() => ({ duration: isDrawerOpen ? 5000 : null }), [isDrawerOpen])
  const toast = useNotificationToast(toastOptions)
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  // Create ArbitrumBridge withdraw actions from successful withdraw swaps
  useEffect(() => {
    const allClaims = [
      ...claimsByStatus.Pending,
      ...claimsByStatus.Available,
      ...claimsByStatus.Complete,
    ]

    Object.values(actionsById)
      .filter(isSwapAction)
      .forEach(swapAction => {
        const swap = swapsById[swapAction.swapMetadata.swapId]
        if (
          swap?.status !== SwapStatus.Success ||
          !swap.sellTxHash ||
          !swap.buyAccountId ||
          swap.swapperName !== SwapperName.ArbitrumBridge ||
          swap.buyAsset.chainId !== ethChainId
        )
          return

        // i.e see this bad boi https://github.com/shapeshift/web/pull/10556
        if (arbitrumActionsByWithdrawTxHash[swap.sellTxHash]) return

        const claim = allClaims.find(claim => claim.tx.txid === swap.sellTxHash)

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
              accountId: swap.sellAccountId,
              destinationAccountId: swap.buyAccountId,
              claimableAt: claim?.claimableAt ?? getArbitrumClaimableAt(Date.now()),
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
        onClick: () => {
          toast.close(actionId)
          openActionCenterClaims()
        },
      })
    },
    [openActionCenterClaims, toast, translate],
  )

  // Rebuild missing actions from tx history, e.g. after a wiped store or an outside withdrawal
  useEffect(() => {
    if (!ethAccountIds.length) return

    const claims = [
      ...claimsByStatus.Pending.map(claim => ({ claim, claimStatus: ClaimStatus.Pending })),
      ...claimsByStatus.Available.map(claim => ({ claim, claimStatus: ClaimStatus.Available })),
    ]

    claims.forEach(({ claim, claimStatus }) => {
      if (arbitrumActionsByWithdrawTxHash[claim.tx.txid]) return

      const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, claimStatus, ethAccountIds)
      if (!action) return

      dispatch(actionSlice.actions.upsertAction(action))
    })
    // claimsByStatus arrays are recreated on every render, use length for stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    ethAccountIds,
    arbitrumActionsByWithdrawTxHash,
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

  const pendingClaimableAts = claimsByStatus.Pending.map(claim => claim.claimableAt).join()

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

          const matchedClaim = completedClaim ?? availableClaim ?? pendingClaim
          if (!matchedClaim) return null

          const newStatus = (() => {
            if (completedClaim) return ActionStatus.Claimed
            if (availableClaim) return ActionStatus.ClaimAvailable
            return ActionStatus.Initiated
          })()
          // Only a pending claim's estimate still matters
          const claimableAt =
            newStatus === ActionStatus.Initiated
              ? matchedClaim.claimableAt
              : action.arbitrumBridgeMetadata.claimableAt

          // Only write on a real change, see https://github.com/shapeshift/web/pull/10556
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
    // claimsByStatus arrays are recreated on every render, use length for stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    notifyClaimAvailable,
    pendingArbitrumBridgeActions,
    claimsByStatus.Available.length,
    claimsByStatus.Complete.length,
    claimsByStatus.Pending.length,
    pendingClaimableAts,
  ])

  // Resolves in-flight claims, including ones broadcast before a reload
  const claimingActions = useMemo(
    () =>
      Object.values(actionsById)
        .filter(isArbitrumBridgeWithdrawAction)
        .filter(
          action =>
            action.status === ActionStatus.ClaimAvailable &&
            Boolean(action.arbitrumBridgeMetadata.claimTxHash),
        ),
    [actionsById],
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
  })

  const claimTxStatusKey = claimTxStatuses.map(({ data }) => data).join()

  useEffect(() => {
    claimingActions.forEach((action, i) => {
      switch (claimTxStatuses[i]?.data) {
        case TxStatus.Confirmed:
          dispatch(actionSlice.actions.upsertAction({ ...action, status: ActionStatus.Claimed }))
          return
        case TxStatus.Failed:
          dispatch(
            actionSlice.actions.upsertAction({
              ...action,
              arbitrumBridgeMetadata: { ...action.arbitrumBridgeMetadata, claimTxHash: undefined },
            }),
          )
          return
        default:
          return
      }
    })
    // claimTxStatuses is recreated on every render, use its statuses for a stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, claimingActions, claimTxStatusKey])
}
