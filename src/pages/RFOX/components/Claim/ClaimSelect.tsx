import { CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useGetUnstakingRequestsQuery } from '../../hooks/useGetUnstakingRequestsQuery'
import { ChainNotSupported } from '../Shared/ChainNotSupported'
import { ConnectWallet } from '../Shared/ConnectWallet'
import { ClaimRow } from './ClaimRow'
import type { ClaimRouteProps } from './types'

import { AssetIcon } from '@/components/AssetIcon'
import { ClaimStatus } from '@/components/ClaimRow/types'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getRfoxChainId } from '@/pages/RFOX/helpers'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { selectPendingRfoxClaimActions } from '@/state/slices/actionSlice/selectors'
import { useAppSelector } from '@/state/store'

type NoClaimsAvailableProps = {
  isError?: boolean
  setStepIndex?: (index: number) => void
}

const NoClaimsAvailable: FC<NoClaimsAvailableProps> = ({ isError }) => {
  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <Text translation='RFOX.noClaimsAvailable' fontSize='xl' fontWeight={'bold'} />
      <Text
        translation={isError ? 'RFOX.errorFetchingClaims' : 'RFOX.noClaimsAvailableDescription'}
        fontSize='md'
        color='gray.400'
        mb={4}
      />
    </Center>
  )
}

export const ClaimSelect: FC<ClaimRouteProps> = ({ headerComponent }) => {
  const navigate = useNavigate()
  const { isConnected } = useWallet().state
  const { stakingAssetAccountId, stakingAssetId } = useRFOXContext()

  const allUnstakingRequestsQuery = useGetUnstakingRequestsQuery()

  const pendingRfoxClaimActions = useAppSelector(selectPendingRfoxClaimActions)

  const claimingRequestIds = useMemo(
    () =>
      new Set(pendingRfoxClaimActions.map(action => action.rfoxClaimActionMetadata.request.id)),
    [pendingRfoxClaimActions],
  )

  const accountUnstakingRequests = useMemo(
    () => allUnstakingRequestsQuery.data?.byAccountId[stakingAssetAccountId ?? ''],
    [allUnstakingRequestsQuery.data?.byAccountId, stakingAssetAccountId],
  )

  const claimBody = useMemo(() => {
    if (!isConnected) return <ConnectWallet />
    if (!stakingAssetAccountId)
      return <ChainNotSupported chainId={getRfoxChainId(stakingAssetId)} />
    if (!stakingAssetAccountId) return

    if (
      allUnstakingRequestsQuery.isPending ||
      allUnstakingRequestsQuery.isPaused ||
      allUnstakingRequestsQuery.isFetching
    ) {
      return new Array(2).fill(null).map((_, index) => <Skeleton key={index} height={16} my={2} />)
    }

    if (allUnstakingRequestsQuery.isError || !accountUnstakingRequests?.length) {
      return <NoClaimsAvailable isError={allUnstakingRequestsQuery.isError} />
    }

    return accountUnstakingRequests.map(unstakingRequest => {
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      // A claim that has been broadcast but not yet confirmed is still returned by the contract, so
      // without this the row stays actionable and the claim can be submitted again
      const isClaimInProgress = claimingRequestIds.has(unstakingRequest.id)
      const status =
        isAvailable && !isClaimInProgress ? ClaimStatus.Available : ClaimStatus.Pending
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()

      const handleClaimClick = (claimId: number) => {
        navigate(`/fox-ecosystem/${claimId}/confirm`, {
          state: {
            selectedUnstakingRequest: unstakingRequest,
          },
        })
      }

      return (
        <ClaimRow
          stakingAssetId={unstakingRequest.stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoBaseUnit={unstakingRequest.amountCryptoBaseUnit.toString()}
          status={status}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={unstakingRequest.index}
          isClaimInProgress={isClaimInProgress}
          onClaimClick={() => handleClaimClick(unstakingRequest.index)}
        />
      )
    })
  }, [
    isConnected,
    allUnstakingRequestsQuery,
    claimingRequestIds,
    navigate,
    stakingAssetAccountId,
    stakingAssetId,
    accountUnstakingRequests,
  ])

  return (
    <SlideTransition>
      <Stack>{headerComponent}</Stack>
      <CardBody py={12}>
        <Flex flexDir='column' gap={4}>
          {claimBody}
        </Flex>
      </CardBody>
    </SlideTransition>
  )
}
