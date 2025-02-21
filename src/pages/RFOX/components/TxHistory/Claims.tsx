import { CardBody, Skeleton } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftmonorepo/caip'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'

import { ClaimRow } from '../Claim/ClaimRow'

import { ClaimStatus } from '@/components/ClaimRow/types'
import { Text } from '@/components/Text'
import { useGetUnstakingRequestsQuery } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'

type ClaimsProps = {
  headerComponent: JSX.Element
}

export const Claims = ({ headerComponent }: ClaimsProps) => {
  const { stakingAssetAccountId } = useRFOXContext()

  const setConfirmedQuote = useCallback(() => {}, [])

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const unstakingRequestsQuery = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const claims = useMemo(() => {
    if (!stakingAssetAccountId) return null

    if (!unstakingRequestsQuery.isSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!unstakingRequestsQuery.data.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return unstakingRequestsQuery.data.map(unstakingRequest => {
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
          amountCryptoBaseUnit={unstakingRequest.unstakingBalance.toString()}
          status={status}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={unstakingRequest.index}
        />
      )
    })
  }, [
    setConfirmedQuote,
    stakingAssetAccountId,
    unstakingRequestsQuery.data,
    unstakingRequestsQuery.isSuccess,
  ])

  return (
    <CardBody>
      {headerComponent}
      <Skeleton
        isLoaded={
          !unstakingRequestsQuery.isLoading &&
          !unstakingRequestsQuery.isPending &&
          !unstakingRequestsQuery.isPaused &&
          !unstakingRequestsQuery.isRefetching
        }
      >
        {claims}
      </Skeleton>
    </CardBody>
  )
}
