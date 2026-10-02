import { fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useReadContracts } from 'wagmi'

import { getRfoxNetworkId, getStakingContract } from '../helpers'
import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'
import { getUnstakingRequestsQueryKey } from './useGetUnstakingRequestsQuery/utils'
import { supportedStakingAssetIds } from './useRfoxContext'

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

      // A failed claim leaves the request claimable
      if (tx.status === TxStatus.Failed) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.ClaimAvailable,
            rfoxClaimActionMetadata: { request: action.rfoxClaimActionMetadata.request },
          }),
        )
        return
      }

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

  // Dates a request from its unstake, the period only changes by governance
  const cooldownPeriods = useReadContracts({
    contracts: supportedStakingAssetIds.map(
      stakingAssetId =>
        ({
          abi: RFOX_ABI,
          address: getStakingContract(stakingAssetId),
          functionName: 'cooldownPeriod',
          chainId: getRfoxNetworkId(stakingAssetId),
        }) as const,
    ),
    query: { staleTime: Infinity },
  })

  const cooldownPeriodByStakingAssetId = useMemo(
    () =>
      Object.fromEntries(
        supportedStakingAssetIds.map((stakingAssetId, i) => [
          stakingAssetId,
          cooldownPeriods.data?.[i]?.result,
        ]),
      ),
    [cooldownPeriods.data],
  )

  // A cooldown outlives any timeout, so the next check is at most a day out
  const [cooldownTick, setCooldownTick] = useState(0)

  useEffect(() => {
    if (!allUnstakingRequests.isSuccess) return

    const now = Date.now()
    const { all, byAccountId } = allUnstakingRequests.data

    all.forEach(request => {
      const cooldownExpiryMs = Number(request.cooldownExpiry) * 1000
      const isClaimable = now >= cooldownExpiryMs
      const action = actions[request.id]

      // Only a cooled down request moves forward, the claim flow owns it from there
      if (action && isRfoxClaimAction(action)) {
        if (isClaimable && action.status === ActionStatus.Initiated) {
          dispatch(actionSlice.actions.upsertAction({ ...action, status: ActionStatus.ClaimAvailable }))
        }
        return
      }

      if (!assets[request.stakingAssetId]) return

      const cooldownPeriod = cooldownPeriodByStakingAssetId[request.stakingAssetId]
      if (cooldownPeriod === undefined) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: request.id,
          status: isClaimable ? ActionStatus.ClaimAvailable : ActionStatus.Initiated,
          type: ActionType.RfoxClaim,
          createdAt: cooldownExpiryMs - Number(cooldownPeriod) * 1000,
          updatedAt: now,
          rfoxClaimActionMetadata: {
            request,
          },
        }),
      )
    })

    // A claimable request missing from its account's fresh requests was claimed elsewhere
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

    const nextCooldownExpiryMs = Math.min(
      ...all.map(request => Number(request.cooldownExpiry) * 1000).filter(ms => ms > now),
    )
    if (!Number.isFinite(nextCooldownExpiryMs)) return

    const timeout = setTimeout(
      () => setCooldownTick(tick => tick + 1),
      Math.min(nextCooldownExpiryMs - now, 24 * 60 * 60 * 1000),
    )

    return () => clearTimeout(timeout)
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allUnstakingRequests.data,
    allUnstakingRequests.isSuccess,
    cooldownPeriodByStakingAssetId,
    cooldownTick,
    dispatch,
    actionIds,
  ])
}
