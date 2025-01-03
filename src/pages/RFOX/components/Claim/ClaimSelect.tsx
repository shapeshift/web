import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { foxAssetId, foxEthLpArbitrumAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
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
import { fromBaseUnit } from 'lib/math'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { RfoxTabIndex } from 'pages/RFOX/Widget'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  const {
    state: { isConnected },
  } = useWallet()

  const { stakingAssetId, stakingAssetAccountId } = useRFOXContext()
  const history = useHistory()
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const lpStakingAsset = useAppSelector(state => selectAssetById(state, foxEthLpArbitrumAssetId))

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const {
    data: unstakingRequestResponse,
    isLoading: isUnstakingRequestLoading,
    isPending: isUnstakingRequestPending,
    isPaused: isUnstakingRequestPaused,
    isError: isUnstakingRequestError,
    isRefetching: isUnstakingRequestRefetching,
  } = useGetUnstakingRequestsQuery({ stakingAssetAccountAddress })

  const handleClaimClick = useCallback(() => history.push(ClaimRoutePaths.Confirm), [history])

  const claimBody = useMemo(() => {
    if (!isConnected) return <ConnectWallet />
    if (!stakingAssetAccountAddress) return <ChainNotSupported chainId={stakingAsset?.chainId} />
    if (
      isUnstakingRequestLoading ||
      isUnstakingRequestPending ||
      isUnstakingRequestPaused ||
      isUnstakingRequestRefetching
    )
      return new Array(2).fill(null).map((_, index) => <Skeleton key={index} height={16} my={2} />)
    if (isUnstakingRequestError || !unstakingRequestResponse.length)
      return <NoClaimsAvailable isError={isUnstakingRequestError} setStepIndex={setStepIndex} />

    return unstakingRequestResponse.map(unstakingRequest => {
      const selectedAsset =
        unstakingRequest.contractAddress === RFOX_PROXY_CONTRACT ? stakingAsset : lpStakingAsset

      const amountCryptoPrecision = fromBaseUnit(
        unstakingRequest.unstakingBalance.toString() ?? '',
        selectedAsset?.precision ?? 0,
      )
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()
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
          onClaimClick={handleClaimClick}
        />
      )
    })
  }, [
    isConnected,
    stakingAssetAccountAddress,
    isUnstakingRequestLoading,
    isUnstakingRequestPending,
    isUnstakingRequestPaused,
    isUnstakingRequestRefetching,
    isUnstakingRequestError,
    unstakingRequestResponse,
    lpStakingAsset,
    stakingAsset,
    setStepIndex,
    stakingAssetId,
    setConfirmedQuote,
    handleClaimClick,
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
