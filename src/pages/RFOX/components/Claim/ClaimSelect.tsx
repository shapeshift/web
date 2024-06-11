import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import {
  type ChainId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
} from '@shapeshiftoss/caip'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import dayjs from 'dayjs'
import { type FC, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract, useReadContracts } from 'wagmi'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { chainIdToChainDisplayName } from 'lib/utils'
import { RfoxTabIndex } from 'pages/RFOX/RFOX'
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
    data: unstakingRequestCountResponse,
    isSuccess: isUnstakingRequestCountSuccess,
    isLoading: isUnstakingRequestCountLoading,
    refetch: refetchUnstakingRequestCount,
  } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'getUnstakingRequestCount',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)], // actually defined, see enabled below
    chainId: arbitrum.id,
    query: {
      enabled: Boolean(stakingAssetAccountAddress),
    },
  })

  const hasClaims = useMemo(
    () =>
      isUnstakingRequestCountSuccess &&
      unstakingRequestCountResponse &&
      unstakingRequestCountResponse > 0n,
    [isUnstakingRequestCountSuccess, unstakingRequestCountResponse],
  )

  const contracts = useMemo(
    () =>
      stakingAssetAccountAddress
        ? Array.from(
            { length: Number(unstakingRequestCountResponse) },
            (_, index) =>
              ({
                abi: foxStakingV1Abi,
                address: RFOX_PROXY_CONTRACT_ADDRESS,
                functionName: 'getUnstakingRequest',
                args: [getAddress(stakingAssetAccountAddress), index],
                chainId: arbitrum.id,
              }) as const,
          )
        : [],
    [stakingAssetAccountAddress, unstakingRequestCountResponse],
  )

  const {
    data: unstakingRequestResponse,
    isSuccess: isUnstakingRequestSuccess,
    isLoading: isUnstakingRequestLoading,
    refetch: refetchUnstakingRequest,
    isRefetching: isUnstakingRequestRefetching,
  } = useReadContracts({
    contracts,
    allowFailure: false,
    query: {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 60000, // 1 minute
    },
  })

  useEffect(() => {
    // Refetch available claims whenever we re-open the Claim tab (this component)
    refetchUnstakingRequestCount()
    refetchUnstakingRequest()
  }, [refetchUnstakingRequest, refetchUnstakingRequestCount])

  const claimBody = useMemo(() => {
    return (() => {
      switch (true) {
        case !stakingAssetAccountAddress:
          return <ChainNotSupported chainId={stakingAsset?.chainId} />
        case hasClaims && isUnstakingRequestSuccess:
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
    hasClaims,
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
        <Skeleton
          isLoaded={
            !isUnstakingRequestCountLoading &&
            !isUnstakingRequestLoading &&
            !isUnstakingRequestRefetching
          }
        >
          <Flex flexDir='column' gap={4}>
            {claimBody}
          </Flex>
        </Skeleton>
      </CardBody>
    </SlideTransition>
  )
}
