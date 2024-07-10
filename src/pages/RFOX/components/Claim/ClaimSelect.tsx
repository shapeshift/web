import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import {
  type ChainId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
} from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { ClaimStatus } from 'components/ClaimRow/types'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { chainIdToChainDisplayName } from 'lib/utils'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { RfoxTabIndex } from 'pages/RFOX/Widget'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from './ClaimRow'
import type { RfoxClaimQuote } from './types'
import { ClaimRoutePaths, type ClaimRouteProps } from './types'

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

type ChainNotSupportedProps = {
  chainId: ChainId | undefined
}

const ChainNotSupported: FC<ChainNotSupportedProps> = ({ chainId }) => {
  const translate = useTranslate()

  if (!chainId) return null

  const chainLabel = chainIdToChainDisplayName(chainId)

  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <Text translation='RFOX.noSupportedChains' fontSize='xl' fontWeight={'bold'} mb={4} />
      <RawText fontSize='md' color='gray.400' mb={4} textAlign={'center'}>
        {translate('RFOX.noSupportedChainsDescription', { chainLabel })}
      </RawText>
    </Center>
  )
}

export const ClaimSelect: FC<ClaimSelectProps & ClaimRouteProps> = ({
  headerComponent,
  setConfirmedQuote,
  setStepIndex,
}) => {
  const history = useHistory()
  const stakingAssetId = foxOnArbitrumOneAssetId
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  // TODO(gomes): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

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
    if (!stakingAssetAccountAddress) return <ChainNotSupported chainId={stakingAsset?.chainId} />
    if (
      isUnstakingRequestLoading ||
      isUnstakingRequestPending ||
      isUnstakingRequestPaused ||
      isUnstakingRequestRefetching
    )
      return new Array(2).fill(null).map(() => <Skeleton height={16} my={2} />)
    if (isUnstakingRequestError || !unstakingRequestResponse.length)
      return <NoClaimsAvailable isError={isUnstakingRequestError} setStepIndex={setStepIndex} />

    return unstakingRequestResponse.map((unstakingRequest, index) => {
      const amountCryptoPrecision = fromBaseUnit(
        unstakingRequest.unstakingBalance.toString() ?? '',
        stakingAsset?.precision ?? 0,
      )
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()
      const status = isAvailable ? ClaimStatus.Available : ClaimStatus.NotYetAvailable
      return (
        <ClaimRow
          stakingAssetId={stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoPrecision={amountCryptoPrecision?.toString() ?? ''}
          status={status}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={index}
          onClaimClick={handleClaimClick}
        />
      )
    })
  }, [
    stakingAssetAccountAddress,
    stakingAsset?.chainId,
    stakingAsset?.precision,
    isUnstakingRequestLoading,
    isUnstakingRequestPending,
    isUnstakingRequestPaused,
    isUnstakingRequestRefetching,
    isUnstakingRequestError,
    unstakingRequestResponse,
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
