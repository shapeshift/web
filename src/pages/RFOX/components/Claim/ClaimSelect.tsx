import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import {
  type ChainId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
} from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { type FC, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { chainIdToChainDisplayName } from 'lib/utils'
import { useGetUnstakingRequestQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestQuery'
import { RfoxTabIndex } from 'pages/RFOX/Widget'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from './ClaimRow'
import type { RfoxClaimQuote } from './types'
import { type ClaimRouteProps, ClaimStatus } from './types'

type ClaimSelectProps = {
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
}

type NoClaimsAvailableProps = {
  setStepIndex: (index: number) => void
}

const NoClaimsAvailable: FC<NoClaimsAvailableProps> = ({ setStepIndex }) => {
  const translate = useTranslate()

  const handleUnstakeClick = useCallback(() => {
    setStepIndex(RfoxTabIndex.Unstake)
  }, [setStepIndex])

  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <Text translation='RFOX.noClaimsAvailable' fontSize='xl' fontWeight={'bold'} />
      <Text translation='RFOX.noClaimsAvailableDescription' fontSize='md' color='gray.400' mb={4} />
      <Button colorScheme='blue' onClick={handleUnstakeClick}>
        {translate('RFOX.unstakeNow')}
      </Button>
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
    isSuccess: isUnstakingRequestSuccess,
    isLoading: isUnstakingRequestLoading,
    refetch: refetchUnstakingRequest,
    isRefetching: isUnstakingRequestRefetching,
  } = useGetUnstakingRequestQuery({ stakingAssetAccountAddress })

  useEffect(() => {
    // Refetch available claims whenever we re-open the Claim tab (this component)
    refetchUnstakingRequest()
  }, [refetchUnstakingRequest])

  const claimBody = useMemo(() => {
    return (() => {
      switch (true) {
        case !stakingAssetAccountAddress:
          return <ChainNotSupported chainId={stakingAsset?.chainId} />
        case isUnstakingRequestSuccess:
          return unstakingRequestResponse?.map((unstakingRequest, index) => {
            const amountCryptoPrecision = fromBaseUnit(
              unstakingRequest.unstakingBalance.toString() ?? '',
              stakingAsset?.precision ?? 0,
            )
            const currentTimestampMs: number = Date.now()
            const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
            const isAvailable = currentTimestampMs >= unstakingTimestampMs
            const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
            const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()
            const status = isAvailable ? ClaimStatus.Available : ClaimStatus.CoolingDown
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
        default:
          return <NoClaimsAvailable setStepIndex={setStepIndex} />
      }
    })()
  }, [
    stakingAssetAccountAddress,
    stakingAsset?.chainId,
    stakingAsset?.precision,
    isUnstakingRequestSuccess,
    unstakingRequestResponse,
    setStepIndex,
    stakingAssetId,
    setConfirmedQuote,
  ])

  return (
    <SlideTransition>
      <Stack>{headerComponent}</Stack>
      <CardBody py={12}>
        <Skeleton isLoaded={!isUnstakingRequestLoading && !isUnstakingRequestRefetching}>
          <Flex flexDir='column' gap={4}>
            {claimBody}
          </Flex>
        </Skeleton>
      </CardBody>
    </SlideTransition>
  )
}
