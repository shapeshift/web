import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'

import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingRfoxClaimActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, ActionType, isRfoxClaimAction } from '@/state/slices/actionSlice/types'
import { selectAssets, selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useRfoxClaimActionSubscriber = () => {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const allUnstakingRequests = useGetUnstakingRequestsQuery()

  const pendingRfoxClaimActions = useAppSelector(selectPendingRfoxClaimActions)
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const actionIds = useAppSelector(actionSlice.selectors.selectActionIds)
  const txs = useAppSelector(selectTxs)

  useEffect(() => {
    if (!pendingRfoxClaimActions.length) return

    const now = Date.now()

    pendingRfoxClaimActions.forEach(action => {
      if (!action.rfoxClaimActionMetadata.txHash) return
      const asset = assets[action.rfoxClaimActionMetadata.request.stakingAssetId]
      if (!asset) return

      const stakingAssetAccountId = action.rfoxClaimActionMetadata.request.stakingAssetAccountId
      const txHash = action.rfoxClaimActionMetadata.txHash
      const accountAddress = fromAccountId(stakingAssetAccountId).account

      const serializedTxIndex = serializeTxIndex(stakingAssetAccountId, txHash, accountAddress)

      const tx = txs[serializedTxIndex]

      if (!tx) return
      if (tx.status !== TxStatus.Confirmed) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: action.id,
          status: ActionStatus.Claimed,
          type: ActionType.RfoxClaim,
          createdAt: action.createdAt,
          updatedAt: now,
          rfoxClaimActionMetadata: {
            ...action.rfoxClaimActionMetadata,
          },
        }),
      )

      queryClient.invalidateQueries({
        queryKey: ['getUnstakingRequests', { stakingAssetAccountId }],
      })
    })
  }, [txs, assets, pendingRfoxClaimActions, dispatch, queryClient])

  useEffect(() => {
    if (!allUnstakingRequests.isSuccess) return
    const now = Date.now()

    allUnstakingRequests.data.all.forEach(request => {
      const cooldownExpiryMs = Number(request.cooldownExpiry) * 1000

      const maybeStoreAction = actions[request.id]

      if (now >= cooldownExpiryMs) {
        // This was available and is still available, no-op.
        if (
          maybeStoreAction &&
          isRfoxClaimAction(maybeStoreAction) &&
          maybeStoreAction.status === ActionStatus.ClaimAvailable
        )
          return

        const asset = assets[request.stakingAssetId]
        if (!asset) return

        dispatch(
          actionSlice.actions.upsertAction({
            id: request.id,
            status: ActionStatus.ClaimAvailable,
            type: ActionType.RfoxClaim,
            createdAt: cooldownExpiryMs,
            updatedAt: now,
            rfoxClaimActionMetadata: {
              request,
            },
          }),
        )
      }
    })
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUnstakingRequests.data, allUnstakingRequests.isSuccess, dispatch, actionIds])
}
