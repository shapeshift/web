import { CardBody, Skeleton } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from '../Claim/ClaimRow'

type ClaimsProps = {
  headerComponent: JSX.Element
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId
}

export const Claims = ({ headerComponent, stakingAssetId, stakingAssetAccountId }: ClaimsProps) => {
  const setConfirmedQuote = useCallback(() => {}, [])

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(stakingAssetAccountId).account,
    [stakingAssetAccountId],
  )

  const unstakingRequestsResult = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const claims = useMemo(() => {
    if (!stakingAsset) return null

    if (!unstakingRequestsResult.isSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!unstakingRequestsResult.data.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return unstakingRequestsResult.data.map((unstakingRequest, index) => {
      const amountCryptoPrecision = fromBaseUnit(
        unstakingRequest.unstakingBalance.toString(),
        stakingAsset?.precision ?? 0,
      )

      const currentTimestampMs = Date.now()
      const unstakingTimestampMs = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(currentTimestampMs + cooldownDeltaMs).fromNow()
      const status = isAvailable ? ClaimStatus.Available : ClaimStatus.Pending

      return (
        <ClaimRow
          stakingAssetId={stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoPrecision={amountCryptoPrecision?.toString() ?? ''}
          status={status}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={index}
        />
      )
    })
  }, [setConfirmedQuote, stakingAsset, stakingAssetId, unstakingRequestsResult])

  if (!stakingAsset) return null

  return (
    <CardBody>
      {headerComponent}
      <Skeleton
        isLoaded={
          !unstakingRequestsResult.isLoading &&
          !unstakingRequestsResult.isPending &&
          !unstakingRequestsResult.isPaused &&
          !unstakingRequestsResult.isRefetching
        }
      >
        {claims}
      </Skeleton>
    </CardBody>
  )
}
