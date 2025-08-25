import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { arbitrumChainId, foxAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useGetUnstakingRequestsQuery } from '../../hooks/useGetUnstakingRequestsQuery'
import { RfoxRoute } from '../../types'
import { ChainNotSupported } from '../Shared/ChainNotSupported'
import { ConnectWallet } from '../Shared/ConnectWallet'
import { ClaimRow } from './ClaimRow'
import type { ClaimRouteProps } from './types'

import { AssetIcon } from '@/components/AssetIcon'
import { ClaimStatus } from '@/components/ClaimRow/types'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { RfoxTabIndex } from '@/pages/RFOX/Widget'

type NoClaimsAvailableProps = {
  isError?: boolean
  setStepIndex?: (index: number) => void
}

const NoClaimsAvailable: FC<NoClaimsAvailableProps> = ({ isError, setStepIndex }) => {
  const translate = useTranslate()

  const handleUnstakeClick = useCallback(() => {
    setStepIndex?.(RfoxTabIndex.Unstake)
  }, [setStepIndex])

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
      {!isError && setStepIndex && (
        <Button colorScheme='blue' onClick={handleUnstakeClick}>
          {translate('RFOX.unstakeNow')}
        </Button>
      )}
    </Center>
  )
}

export const ClaimSelect: FC<ClaimRouteProps> = ({ headerComponent, setStepIndex }) => {
  const navigate = useNavigate()
  const { isConnected } = useWallet().state
  const { stakingAssetAccountId } = useRFOXContext()
  const isRFOXFoxEcosystemPageEnabled = useFeatureFlag('RfoxFoxEcosystemPage')

  const allUnstakingRequestsQuery = useGetUnstakingRequestsQuery()

  const accountUnstakingRequests = useMemo(
    () => allUnstakingRequestsQuery.data?.byAccountId[stakingAssetAccountId ?? ''],
    [allUnstakingRequestsQuery.data?.byAccountId, stakingAssetAccountId],
  )

  const claimBody = useMemo(() => {
    if (!isConnected) return <ConnectWallet />
    if (!stakingAssetAccountId) return <ChainNotSupported chainId={arbitrumChainId} />
    if (!stakingAssetAccountId) return

    if (
      allUnstakingRequestsQuery.isPending ||
      allUnstakingRequestsQuery.isPaused ||
      allUnstakingRequestsQuery.isFetching
    ) {
      return new Array(2).fill(null).map((_, index) => <Skeleton key={index} height={16} my={2} />)
    }

    if (allUnstakingRequestsQuery.isError || !accountUnstakingRequests?.length) {
      return (
        <NoClaimsAvailable
          isError={allUnstakingRequestsQuery.isError}
          setStepIndex={setStepIndex}
        />
      )
    }

    return accountUnstakingRequests.map(unstakingRequest => {
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const status = isAvailable ? ClaimStatus.Available : ClaimStatus.Pending
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()

      const handleClaimClick = (claimId: number) => {
        navigate(
          !isRFOXFoxEcosystemPageEnabled
            ? `${RfoxRoute.Claim}/${claimId}/confirm`
            : `/fox-ecosystem/${claimId}/confirm`,
          {
            state: {
              selectedUnstakingRequest: unstakingRequest,
            },
          },
        )
      }

      return (
        <ClaimRow
          stakingAssetId={unstakingRequest.stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoBaseUnit={unstakingRequest.amountCryptoBaseUnit.toString()}
          status={status}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={unstakingRequest.index}
          // eslint-disable-next-line react-memo/require-usememo
          onClaimClick={() => handleClaimClick(unstakingRequest.index)}
        />
      )
    })
  }, [
    isConnected,
    setStepIndex,
    allUnstakingRequestsQuery,
    navigate,
    stakingAssetAccountId,
    accountUnstakingRequests,
    isRFOXFoxEcosystemPageEnabled,
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
