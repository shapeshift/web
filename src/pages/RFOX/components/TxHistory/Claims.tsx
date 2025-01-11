import { CardBody, Skeleton } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'

import { ClaimRow } from '../Claim/ClaimRow'

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

  const unstakingRequestsResult = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const claims = useMemo(() => {
    if (!stakingAssetAccountId) return null

    if (!unstakingRequestsResult.isSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!unstakingRequestsResult.data.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return unstakingRequestsResult.data.map(unstakingRequest => {
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
    unstakingRequestsResult.data,
    unstakingRequestsResult.isSuccess,
  ])

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
