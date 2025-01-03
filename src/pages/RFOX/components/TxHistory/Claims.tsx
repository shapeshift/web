import { CardBody, Skeleton } from '@chakra-ui/react'
import { foxEthLpArbitrumAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import dayjs from 'dayjs'
import { useCallback, useMemo } from 'react'
import { ClaimStatus } from 'components/ClaimRow/types'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from '../Claim/ClaimRow'

type ClaimsProps = {
  headerComponent: JSX.Element
}

export const Claims = ({ headerComponent }: ClaimsProps) => {
  const { stakingAssetAccountId, stakingAssetId } = useRFOXContext()
  const setConfirmedQuote = useCallback(() => {}, [])

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const lpStakingAsset = useAppSelector(state => selectAssetById(state, foxEthLpArbitrumAssetId))

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const unstakingRequestsResult = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const claims = useMemo(() => {
    if (!stakingAsset || !stakingAssetAccountId || !lpStakingAsset) return null

    if (!unstakingRequestsResult.isSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!unstakingRequestsResult.data.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return unstakingRequestsResult.data.map(unstakingRequest => {
      const selectedAsset =
        unstakingRequest.contractAddress === RFOX_PROXY_CONTRACT ? stakingAsset : lpStakingAsset

      const amountCryptoPrecision = fromBaseUnit(
        unstakingRequest.unstakingBalance.toString(),
        selectedAsset?.precision ?? 0,
      )

      const currentTimestampMs = Date.now()
      const unstakingTimestampMs = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(currentTimestampMs + cooldownDeltaMs).fromNow()
      const status = isAvailable ? ClaimStatus.Available : ClaimStatus.Pending

      return (
        <ClaimRow
          stakingAssetId={selectedAsset?.assetId ?? stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoPrecision={amountCryptoPrecision?.toString() ?? ''}
          status={status}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={unstakingRequest.index}
        />
      )
    })
  }, [
    setConfirmedQuote,
    stakingAsset,
    stakingAssetAccountId,
    stakingAssetId,
    unstakingRequestsResult.data,
    unstakingRequestsResult.isSuccess,
    lpStakingAsset,
  ])

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
