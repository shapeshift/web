import { Box, CardBody, Skeleton } from '@chakra-ui/react'
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

  const {
    data: unstakingRequestResponse,
    isLoading: isUnstakingRequestLoading,
    isPending: isUnstakingRequestPending,
    isPaused: isUnstakingRequestPaused,
    isRefetching: isUnstakingRequestRefetching,
    isSuccess: isUnstakingRequestSuccess,
  } = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const claims = useMemo(() => {
    if (!stakingAsset) return null

    if (
      isUnstakingRequestLoading ||
      isUnstakingRequestPending ||
      isUnstakingRequestPaused ||
      isUnstakingRequestRefetching
    )
      return new Array(2).fill(null).map((_, i) => <Skeleton key={i} height={16} my={2} />)

    if (!isUnstakingRequestSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!unstakingRequestResponse.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return (unstakingRequestResponse ?? []).map((unstakingRequest, index) => {
      const amountCryptoPrecision = fromBaseUnit(
        unstakingRequest.unstakingBalance.toString(),
        stakingAsset?.precision ?? 0,
      )
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()
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
  }, [
    isUnstakingRequestLoading,
    isUnstakingRequestPaused,
    isUnstakingRequestPending,
    isUnstakingRequestRefetching,
    isUnstakingRequestSuccess,
    setConfirmedQuote,
    stakingAsset,
    stakingAssetId,
    unstakingRequestResponse,
  ])

  if (!stakingAsset) return null

  return (
    <CardBody>
      {headerComponent}
      <Box>{claims}</Box>
    </CardBody>
  )
}
