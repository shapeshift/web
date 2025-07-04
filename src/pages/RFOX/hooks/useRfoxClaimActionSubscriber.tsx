import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'

import { useGetUnstakingRequestsQuery } from './useGetUnstakingRequestsQuery'

import { fromBaseUnit } from '@/lib/math'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
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

  // TODO(gomes): useQueries
  const stakingAssetAccountId = stakingAssetAccountIds[0]
  const stakingAssetAccountAddress = stakingAssetAccountId?.split(':')[2]

  const unstakingRequestsQuery = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  useEffect(() => {
    if (!unstakingRequestsQuery.isSuccess) return
    if (!stakingAssetAccountId) return
    const now = Date.now()
    console.log({ unstakingRequestsQueryData: unstakingRequestsQuery.data })
    unstakingRequestsQuery.data.forEach(request => {
      const cooldownExpiryMs = Number(request.cooldownExpiry) * 1000
      if (now >= cooldownExpiryMs) {
        const asset = assets[request.stakingAssetId]
        const amountCryptoPrecision = fromBaseUnit(request.unstakingBalance, asset?.precision ?? 18)

        dispatch(
          actionSlice.actions.upsertAction({
            id: request.id,
            status: ActionStatus.ClaimAvailable,
            // TODO(gomes): users are not going to be able to make two unstakes per block, so cooldownExpiry as an timestamp *should*
            // be more than enough in terms of being unique.
            // Upsert the index separately, as we *will* need it, no need for a composite we later destructure
            // or alternatively, upsert the whole request here as `request` and call it a day
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
