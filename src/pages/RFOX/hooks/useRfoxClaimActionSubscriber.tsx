import { arbitrumChainId } from '@shapeshiftoss/caip'
import { difference } from 'lodash'
import { useEffect } from 'react'

import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'

import { fromBaseUnit } from '@/lib/math'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, ActionType, isRfoxClaimAction } from '@/state/slices/actionSlice/types'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

// Note: the is a slight misnomer here compared to what we conventionally call a subscriber in action center (a poller)
// However, this *is* reactive on useGetUnstakingRequestsQuery(), with inner queries which do get invalidated, so it is a subscriber in a way, just different

export const useRfoxClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const stakingAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  // TODO(gomes): useQueries and handle multiple AccountIds
  const stakingAssetAccountId = stakingAssetAccountIds[0]
  const stakingAssetAccountAddress = stakingAssetAccountId?.split(':')[2]

  const unstakingRequestsQuery = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  // Get current wallet actions to compare with fetched unstaking requests
  const walletActions = useAppSelector(selectActions)

  console.log({ walletActions })

  useEffect(() => {
    if (!unstakingRequestsQuery.isSuccess) return
    if (!stakingAssetAccountId) return
    const now = Date.now()

    const currentRfoxClaimActions = walletActions.filter(isRfoxClaimAction)
    const currentRfoxClaimActionIds = currentRfoxClaimActions.map(action => action.id)
    const unstakingRequestIds = unstakingRequestsQuery.data.map(request => request.id)
    const staleActionIds = difference(currentRfoxClaimActionIds, unstakingRequestIds)

    console.log({ unstakingRequestIds, staleActionIds })

    // Diff the current unstaking requests in store with the current unstaking requests from the API
    // This will yield us all the confirmed
    staleActionIds.forEach(staleActionId => {
      const action = currentRfoxClaimActions.find(request => request.id === staleActionId)
      if (!action) return
      if (!action.rfoxClaimActionMetadata.txHash) return
      const asset = assets[action.rfoxClaimActionMetadata.assetId]
      if (!asset) return

      const amountCryptoPrecision = fromBaseUnit(
        action.rfoxClaimActionMetadata.amountCryptoBaseUnit,
        assets[action.rfoxClaimActionMetadata.assetId]?.precision ?? 0,
      )

      dispatch(
        actionSlice.actions.upsertAction({
          id: action.id,
          status: ActionStatus.Claimed,
          type: ActionType.RfoxClaim,
          createdAt: action.createdAt,
          updatedAt: Date.now(),
          rfoxClaimActionMetadata: {
            ...action.rfoxClaimActionMetadata,
            message: `Your claim of ${Number(amountCryptoPrecision).toFixed(2)} ${
              asset.symbol
            } is complete`,
          },
        }),
      )
    })

    unstakingRequestsQuery.data.forEach(request => {
      const cooldownExpiryMs = Number(request.cooldownExpiry) * 1000
      if (now >= cooldownExpiryMs) {
        const asset = assets[request.stakingAssetId]
        const amountCryptoPrecision = fromBaseUnit(request.unstakingBalance, asset?.precision ?? 18)

        dispatch(
          actionSlice.actions.upsertAction({
            id: request.id,
            status: ActionStatus.ClaimAvailable,
            type: ActionType.RfoxClaim,
            createdAt: cooldownExpiryMs,
            updatedAt: now,
            rfoxClaimActionMetadata: {
              // TODO(gomes): translations
              message: `Your unstake of ${Number(amountCryptoPrecision).toFixed(2)} ${
                asset?.symbol ?? ''
              } is ready to claim`,
              assetId: request.stakingAssetId,
              amountCryptoBaseUnit: request.unstakingBalance,
              accountId: stakingAssetAccountId as string,
            },
          }),
        )
      }
    })
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    unstakingRequestsQuery.data,
    unstakingRequestsQuery.isSuccess,
    dispatch,
    stakingAssetAccountId,
  ])
}
