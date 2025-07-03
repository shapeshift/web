import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'

import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'

import { fromBaseUnit } from '@/lib/math'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useRfoxClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const stakingAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  // TODO(gomes): useQueries
  const stakingAssetAccountId = stakingAssetAccountIds[0]
  const stakingAssetAccountAddress = stakingAssetAccountId?.split(':')[2]

  const unstakingRequestsQuery = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  useEffect(() => {
    if (!unstakingRequestsQuery.isSuccess) return
    if (!stakingAssetAccountId) return
    const now = Date.now()
    unstakingRequestsQuery.data.forEach(request => {
      const cooldownExpiryMs = Number(request.cooldownExpiry) * 1000
      if (now >= cooldownExpiryMs) {
        const asset = assets[request.stakingAssetId]
        const amount = fromBaseUnit(request.unstakingBalance.toString(), asset?.precision ?? 18)
        dispatch(
          actionSlice.actions.upsertAction({
            id: request.cooldownExpiry.toString(),
            type: ActionType.RfoxClaim,
            status: ActionStatus.ClaimAvailable,
            createdAt: cooldownExpiryMs,
            updatedAt: now,
            message: `Your unstake of ${Number(amount).toFixed(2)} ${
              asset?.symbol ?? ''
            } is ready to claim`,
            assetId: request.stakingAssetId,
            amountCryptoBaseUnit: request.unstakingBalance.toString(),
            accountId: stakingAssetAccountId as string,
          }),
        )
      }
    })
  }, [
    unstakingRequestsQuery.data,
    unstakingRequestsQuery.isSuccess,
    dispatch,
    stakingAssetAccountId,
  ])
}
