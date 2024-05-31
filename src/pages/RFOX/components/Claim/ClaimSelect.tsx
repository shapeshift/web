import { Box, Button, CardBody, Center, Flex, Skeleton, Stack, Tooltip } from '@chakra-ui/react'
import {
  type AssetId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
} from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { formatDistanceToNow } from 'date-fns'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract, useReadContracts } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { TabIndex } from 'pages/RFOX/RFOX'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxClaimQuote } from './types'
import { ClaimRoutePaths, type ClaimRouteProps } from './types'

enum ClaimStatus {
  Available = 'Available',
  CoolingDown = 'Cooling down',
}

type ClaimRowProps = {
  stakingAssetId: AssetId
  amountCryptoPrecision: string
  status: ClaimStatus
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
  cooldownPeriodHuman: string
}

const hoverProps = { bg: 'gray.700' }

const ClaimRow: FC<ClaimRowProps> = ({
  stakingAssetId: assetId,
  amountCryptoPrecision,
  status,
  setConfirmedQuote,
  cooldownPeriodHuman,
}) => {
  const translate = useTranslate()
  const history = useHistory()

  const stakingAsset = useAppSelector(state => selectAssetById(state, assetId))
  const stakingAssetSymbol = stakingAsset?.symbol
  const stakingAmountCryptoBaseUnit = toBaseUnit(
    bnOrZero(amountCryptoPrecision),
    stakingAsset?.precision ?? 0,
  )

  // TODO(apotheosis): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const claimQuote: RfoxClaimQuote = useMemo(
    () => ({
      claimAssetAccountId: stakingAssetAccountId ?? '',
      claimAssetId: assetId,
      claimAmountCryptoBaseUnit: stakingAmountCryptoBaseUnit,
    }),
    [assetId, stakingAmountCryptoBaseUnit, stakingAssetAccountId],
  )

  const handleClick = useCallback(() => {
    setConfirmedQuote(claimQuote)
    history.push(ClaimRoutePaths.Confirm)
  }, [claimQuote, history, setConfirmedQuote])

  return (
    <Tooltip
      label={translate(
        status === ClaimStatus.Available
          ? 'RFOX.tooltips.cooldownComplete'
          : 'RFOX.tooltips.unstakePendingCooldown',
        { cooldownPeriodHuman },
      )}
    >
      <Flex
        as={Button}
        justifyContent={'space-between'}
        mt={2}
        align='center'
        variant='unstyled'
        p={8}
        borderRadius='md'
        width='100%'
        onClick={handleClick}
        isDisabled={status !== ClaimStatus.Available}
        _hover={hoverProps}
      >
        <Flex>
          <Box mr={4}>
            <AssetIconWithBadge assetId={foxAssetId}>
              <TransactionTypeIcon type={TransferType.Receive} />
            </AssetIconWithBadge>
          </Box>
          <Box mr={4}>
            <RawText fontSize='sm' color='gray.400' align={'start'}>
              {translate('RFOX.unstakeFrom', { assetSymbol: stakingAssetSymbol })}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align={'start'}>
              {stakingAssetSymbol}
            </RawText>
          </Box>
        </Flex>
        <Flex justifyContent={'flex-end'}>
          <Box flexGrow={1} alignItems={'end'}>
            <RawText
              fontSize='sm'
              fontWeight='bold'
              color={status === ClaimStatus.Available ? 'green.300' : 'yellow.300'}
              align={'end'}
            >
              {status}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
              <Amount.Crypto value={amountCryptoPrecision} symbol={stakingAssetSymbol ?? ''} />
            </RawText>
          </Box>
        </Flex>
      </Flex>
    </Tooltip>
  )
}

type ClaimSelectProps = {
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
}

type NoClaimsAvailableProps = {
  setStepIndex: (index: number) => void
}

const NoClaimsAvailable: FC<NoClaimsAvailableProps> = ({ setStepIndex }) => {
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    setStepIndex(TabIndex.Unstake)
  }, [setStepIndex])

  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <Text translation='RFOX.noClaimsAvailable' fontSize='xl' fontWeight={'bold'} />
      <Text translation='RFOX.noClaimsAvailableDescription' fontSize='md' color='gray.400' mb={4} />
      <Button colorScheme='blue' onClick={handleClick}>
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
