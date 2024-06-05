import { Button, CardBody, Center, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { foxAssetId, foxOnArbitrumOneAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { formatDistanceToNow } from 'date-fns'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract, useReadContracts } from 'wagmi'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { TabIndex } from 'pages/RFOX/RFOX'
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
    setStepIndex(TabIndex.Unstake)
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
      Array.from(
        { length: Number(unstakingRequestCountResponse) },
        (_, index) =>
          ({
            abi: foxStakingV1Abi,
            address: RFOX_PROXY_CONTRACT_ADDRESS,
            functionName: 'getUnstakingRequest',
            args: [
              stakingAssetAccountAddress
                ? getAddress(stakingAssetAccountAddress)
                : ('' as Address, BigInt(index)),
              index,
            ],
            chainId: arbitrum.id,
          }) as const,
      ),
    [stakingAssetAccountAddress, unstakingRequestCountResponse],
  )

  const {
    data: unstakingRequestResponse,
    isSuccess: isUnstakingRequestSuccess,
    isLoading: isUnstakingRequestLoading,
  } = useReadContracts({
    contracts,
    allowFailure: false,
    query: {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 60000, // 1 minute
    },
  })

  if (!stakingAssetAccountAddress) return null

  return (
    <SlideTransition>
      <Stack>{headerComponent}</Stack>
      <CardBody py={12}>
        <Skeleton isLoaded={!isUnstakingRequestCountLoading && !isUnstakingRequestLoading}>
          <Flex flexDir='column' gap={4}>
            {hasClaims && isUnstakingRequestSuccess ? (
              unstakingRequestResponse?.map(unstakingRequest => {
                const amountCryptoPrecision = fromBaseUnit(
                  unstakingRequest.unstakingBalance.toString() ?? '',
                  stakingAsset?.precision ?? 0,
                )
                const currentTimestampMs: number = Date.now()
                const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
                const isAvailable = currentTimestampMs >= unstakingTimestampMs
                const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
                const cooldownPeriodHuman = formatDistanceToNow(Date.now() + cooldownDeltaMs, {
                  addSuffix: true,
                })
                const status = isAvailable ? ClaimStatus.Available : ClaimStatus.CoolingDown
                return (
                  <ClaimRow
                    key={unstakingRequest.cooldownExpiry.toString()}
                    stakingAssetId={foxAssetId}
                    amountCryptoPrecision={amountCryptoPrecision?.toString() ?? ''}
                    status={status}
                    setConfirmedQuote={setConfirmedQuote}
                    cooldownPeriodHuman={cooldownPeriodHuman}
                  />
                )
              })
            ) : (
              <NoClaimsAvailable setStepIndex={setStepIndex} />
            )}
          </Flex>
        </Skeleton>
      </CardBody>
    </SlideTransition>
  )
}
