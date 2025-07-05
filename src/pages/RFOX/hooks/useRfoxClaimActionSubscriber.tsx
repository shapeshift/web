import { useEffect } from 'react'

import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'

import { fromBaseUnit } from '@/lib/math'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingRfoxClaimActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectAssets } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

// Note: the is a slight misnomer here compared to what we conventionally call a subscriber in action center (a poller)
// However, this *is* reactive on useGetUnstakingRequestsQuery(), with inner queries which do get invalidated, so it is a subscriber in a way, just different

export const useRfoxClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const allUnstakingRequests = useGetUnstakingRequestsQuery()

  const pendingRfoxClaimActions = useAppSelector(selectPendingRfoxClaimActions)
  const actionIds = useAppSelector(actionSlice.selectors.selectActionIds)

  useEffect(() => {
    if (!pendingRfoxClaimActions.length) return
    const now = Date.now()

    pendingRfoxClaimActions.forEach(action => {
      if (!action.rfoxClaimActionMetadata.txHash) return
      const asset = assets[action.rfoxClaimActionMetadata.request.stakingAssetId]
      if (!asset) return

      const amountCryptoPrecision = fromBaseUnit(
        action.rfoxClaimActionMetadata.request.amountCryptoBaseUnit,
        asset.precision,
      )

      dispatch(
        actionSlice.actions.upsertAction({
          id: action.id,
          status: ActionStatus.Claimed,
          type: ActionType.RfoxClaim,
          createdAt: action.createdAt,
          updatedAt: now,
          rfoxClaimActionMetadata: {
            ...action.rfoxClaimActionMetadata,
            message: `Your claim of ${Number(amountCryptoPrecision).toFixed(2)} ${
              asset.symbol
            } is complete`,
          },
        }),
      )
    })
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRfoxClaimActions, dispatch])

  useEffect(() => {
    if (!allUnstakingRequests.isSuccess) return
    const now = Date.now()

    allUnstakingRequests.data.all.forEach(request => {
      // Don't rug order by updating updatedAt and createdAt, this was already available, and still is
      if (actionIds.includes(request.id)) return

      const cooldownExpiryMs = Number(request.cooldownExpiry) * 1000
      if (now >= cooldownExpiryMs) {
        const asset = assets[request.stakingAssetId]
        const amountCryptoPrecision = fromBaseUnit(
          request.amountCryptoBaseUnit,
          asset?.precision ?? 18,
        )

        dispatch(
          actionSlice.actions.upsertAction({
            id: request.id,
            status: ActionStatus.ClaimAvailable,
            type: ActionType.RfoxClaim,
            createdAt: cooldownExpiryMs,
            updatedAt: now,
            rfoxClaimActionMetadata: {
              request,
              // TODO(gomes): translations
              message: `Your unstake of ${Number(amountCryptoPrecision).toFixed(2)} ${
                asset?.symbol ?? ''
              } is ready to claim`,
            },
          }),
        )
      }
    })
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUnstakingRequests.data, allUnstakingRequests.isSuccess, dispatch, actionIds])
}
