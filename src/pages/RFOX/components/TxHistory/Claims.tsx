import { CardBody, Skeleton } from '@chakra-ui/react'
import dayjs from 'dayjs'
import type { JSX } from 'react'
import { useMemo } from 'react'

import { useGetUnstakingRequestsQuery } from '../../hooks/useGetUnstakingRequestsQuery'
import { ClaimRow } from '../Claim/ClaimRow'

import { ClaimStatus } from '@/components/ClaimRow/types'
import { Text } from '@/components/Text'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'

type ClaimsProps = {
  headerComponent: JSX.Element
}

export const Claims = ({ headerComponent }: ClaimsProps) => {
  const { stakingAssetAccountId } = useRFOXContext()

  const allUnstakingRequestsQuery = useGetUnstakingRequestsQuery()

  const accountUnstakingRequests = useMemo(
    () => allUnstakingRequestsQuery.data?.byAccountId[stakingAssetAccountId ?? ''],
    [allUnstakingRequestsQuery.data?.byAccountId, stakingAssetAccountId],
  )

  const claims = useMemo(() => {
    if (!stakingAssetAccountId) return null

    if (!allUnstakingRequestsQuery.isSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!accountUnstakingRequests?.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return accountUnstakingRequests.map(unstakingRequest => {
      const currentTimestampMs = Date.now()
      const unstakingTimestampMs = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(currentTimestampMs + cooldownDeltaMs).fromNow()
      const status = isAvailable ? ClaimStatus.Available : ClaimStatus.Pending

      return (
        <ClaimRow
          stakingAssetId={unstakingRequest.stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoBaseUnit={unstakingRequest.amountCryptoBaseUnit.toString()}
          status={status}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={unstakingRequest.index}
        />
      )
    })
  }, [stakingAssetAccountId, allUnstakingRequestsQuery, accountUnstakingRequests])

  return (
    <CardBody>
      {headerComponent}
      <Skeleton
        isLoaded={
          !allUnstakingRequestsQuery.isLoading &&
          !allUnstakingRequestsQuery.isPending &&
          !allUnstakingRequestsQuery.isPaused &&
          !allUnstakingRequestsQuery.isRefetching
        }
      >
        {claims}
      </Skeleton>
    </CardBody>
  )
}
