import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'
import {
  getUnstakingRequestsQueryKey,
  isUnstakingRequestClaimable,
} from './useGetUnstakingRequestsQuery/utils'

import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingRfoxClaimActions } from '@/state/slices/actionSlice/selectors'
import type { RfoxClaimAction } from '@/state/slices/actionSlice/types'
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
        queryKey: getUnstakingRequestsQueryKey({ stakingAssetAccountId }),
      })
    })
  }, [txs, assets, pendingRfoxClaimActions, dispatch, queryClient])

  // A pending claim whose tx failed leaves its request claimable again
  const isClaimInFlight = (action: RfoxClaimAction) => {
    if (action.status !== ActionStatus.Pending) return false

    const { request, txHash } = action.rfoxClaimActionMetadata
    if (!txHash) return true

    const accountAddress = fromAccountId(request.stakingAssetAccountId).account
    const serializedTxIndex = serializeTxIndex(request.stakingAssetAccountId, txHash, accountAddress)

    return txs[serializedTxIndex]?.status !== TxStatus.Failed
  }

  useEffect(() => {
    if (!allUnstakingRequests.isSuccess) return

    const now = Date.now()
    const { all, byAccountId } = allUnstakingRequests.data

    all.forEach(request => {
      if (!isUnstakingRequestClaimable(request, now)) return

      const action = actions[request.id]
      if (
        action &&
        isRfoxClaimAction(action) &&
        (action.status === ActionStatus.ClaimAvailable ||
          action.status === ActionStatus.Claimed ||
          isClaimInFlight(action))
      )
        return

      if (!assets[request.stakingAssetId]) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: request.id,
          status: ActionStatus.ClaimAvailable,
          type: ActionType.RfoxClaim,
          createdAt: Number(request.cooldownExpiry) * 1000,
          updatedAt: now,
          rfoxClaimActionMetadata: {
            request,
          },
        }),
      )
    })

    // Ids carry the request's index, which claims reorder, so a missing request was claimed or moved
    Object.values(actions)
      .filter(isRfoxClaimAction)
      .filter(action => action.status === ActionStatus.ClaimAvailable)
      .forEach(action => {
        const accountRequests =
          byAccountId[action.rfoxClaimActionMetadata.request.stakingAssetAccountId]
        if (!accountRequests) return
        if (accountRequests.some(request => request.id === action.id)) return

        dispatch(actionSlice.actions.deleteAction(action.id))
      })
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUnstakingRequests.data, allUnstakingRequests.isSuccess, dispatch, actionIds, txs])
}
