import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { arbitrumChainId, foxAssetId, fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { ClaimStatus } from 'components/ClaimRow/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { RfoxTabIndex } from 'pages/RFOX/Widget'

import { ChainNotSupported } from '../Shared/ChainNotSupported'
import { ConnectWallet } from '../Shared/ConnectWallet'
import { ClaimRow } from './ClaimRow'
import type { ClaimRouteProps, RfoxClaimQuote } from './types'
import { ClaimRoutePaths } from './types'

type ClaimSelectProps = {
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
}

type NoClaimsAvailableProps = {
  isError?: boolean
  setStepIndex: (index: number) => void
}

const NoClaimsAvailable: FC<NoClaimsAvailableProps> = ({ isError, setStepIndex }) => {
  const translate = useTranslate()

  const handleUnstakeClick = useCallback(() => {
    setStepIndex(RfoxTabIndex.Unstake)
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
      {!isError && (
        <Button colorScheme='blue' onClick={handleUnstakeClick}>
          {translate('RFOX.unstakeNow')}
        </Button>
      )}
    </Center>
  )
}

export const ClaimSelect: FC<ClaimSelectProps & ClaimRouteProps> = ({
  headerComponent,
  setConfirmedQuote,
  setStepIndex,
}) => {
  const history = useHistory()
  const { isConnected } = useWallet().state
  const { stakingAssetAccountId } = useRFOXContext()

  console.log({ stakingAssetAccountId })

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const unstakingRequestsResult = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const handleClaimClick = useCallback(() => history.push(ClaimRoutePaths.Confirm), [history])

  const claimBody = useMemo(() => {
    if (!isConnected) return <ConnectWallet />
    if (!stakingAssetAccountAddress) return <ChainNotSupported chainId={arbitrumChainId} />

    if (
      unstakingRequestsResult.isLoading ||
      unstakingRequestsResult.isPending ||
      unstakingRequestsResult.isPaused ||
      unstakingRequestsResult.isFetching
    ) {
      return new Array(2).fill(null).map((_, index) => <Skeleton key={index} height={16} my={2} />)
    }

    if (unstakingRequestsResult.isError || !unstakingRequestsResult.data.length) {
      return (
        <NoClaimsAvailable isError={unstakingRequestsResult.isError} setStepIndex={setStepIndex} />
      )
    }

    return unstakingRequestsResult.data.map(unstakingRequest => {
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()
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
          onClaimClick={handleClaimClick}
        />
      )
    })
  }, [
    handleClaimClick,
    isConnected,
    setConfirmedQuote,
    setStepIndex,
    stakingAssetAccountAddress,
    unstakingRequestsResult,
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
