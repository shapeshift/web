import type { FlexProps, StackProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Stack,
  Tag,
  Text as CText,
  Tooltip,
  usePrevious,
} from '@chakra-ui/react'
import { foxAssetId, foxOnArbitrumOneAssetId, uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbAlertTriangle, TbArrowDown, TbArrowUp } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { Link as RouterLink, useLocation } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { RFOXIcon } from '@/components/Icons/RFOX'
import { Text } from '@/components/Text'
import { useIsWalletConnected } from '@/hooks/useIsWalletConnected/useIsWalletConnected'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatSecondsToDuration } from '@/lib/utils/time'
import type { Filter } from '@/pages/Fox/components/FoxTokenFilterButton'
import { FoxTokenFilterButton } from '@/pages/Fox/components/FoxTokenFilterButton'
import { RFOXSimulator } from '@/pages/Fox/components/RFOXSimulator'
import { useFoxPageContext } from '@/pages/Fox/hooks/useFoxPageContext'
import { ClaimModal } from '@/pages/RFOX/components/ClaimModal'
import { Stats } from '@/pages/RFOX/components/Overview/Stats'
import { StakeModal } from '@/pages/RFOX/components/StakeModal'
import { UnstakeModal } from '@/pages/RFOX/components/UnstakeModal'
import { RFOX_STAKING_ASSET_IDS, RFOX_STAKING_CONFIG } from '@/pages/RFOX/constants'
import { getRfoxChainId, getRfoxStakingConfig, selectStakingBalance } from '@/pages/RFOX/helpers'
import { useCurrentApyQuery } from '@/pages/RFOX/hooks/useCurrentApyQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from '@/pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useGetUnstakingRequestsQuery } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'
import { useLifetimeRewardsUserCurrencyQuery } from '@/pages/RFOX/hooks/useLifetimeRewardsQuery'
import { selectPauseState, useRfoxPauseStateQuery } from '@/pages/RFOX/hooks/useRfoxPauseStateQuery'
import { useRfoxPositionsQuery } from '@/pages/RFOX/hooks/useRfoxPositionsQuery'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { useTimeInPoolQuery } from '@/pages/RFOX/hooks/useTimeInPoolQuery'
import type { AbiStakingInfo } from '@/pages/RFOX/types'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectAssets,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const tbArrowUp = <TbArrowUp />
const tbArrowDown = <TbArrowDown />

const hstackProps: StackProps = {
  flexWrap: {
    base: 'wrap',
    md: 'nowrap',
  },
}

const containerPaddingX = { base: 4, xl: 0 }
const columnsProps = {
  base: 1,
  md: 2,
}
const stackProps: StackProps = {
  width: '100%',
  flexDir: 'column',
  flex: 1,
  spacing: 0,
}

const headerSx: FlexProps['sx'] = {
  alignItems: { base: 'flex-start', md: 'center' },
  justifyContent: 'space-between',
  mb: 8,
  flexDir: {
    base: 'column',
    md: 'row',
  },
}

const headerTitleMb = { base: 4, md: 0 }
const rfoxIconStyles = {
  path: {
    fill: 'url(#rfoxGradient)',
  },
}

export const RFOXSection = () => {
  const isConnected = useIsWalletConnected()

  const translate = useTranslate()
  const { assetAccountNumber } = useFoxPageContext()
  const { setStakingAssetAccountId, setStakingAssetId: setContextStakingAssetId } = useRFOXContext()
  const appDispatch = useAppDispatch()
  const location = useLocation()
  const selectedUnstakingRequest = location.state?.selectedUnstakingRequest as
    | UnstakingRequest
    | undefined

  const [stakingAssetId, setStakingAssetId] = useState(foxAssetId)
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false)
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(!!selectedUnstakingRequest)
  const previousIsClaimModalOpen = usePrevious(isClaimModalOpen)

  useEffect(() => {
    if (selectedUnstakingRequest) {
      setStakingAssetAccountId(selectedUnstakingRequest.stakingAssetAccountId)
    }
  }, [selectedUnstakingRequest, setStakingAssetAccountId])

  useEffect(() => {
    if (selectedUnstakingRequest && !isClaimModalOpen && !previousIsClaimModalOpen) {
      setIsClaimModalOpen(true)
    }
  }, [selectedUnstakingRequest, isClaimModalOpen, previousIsClaimModalOpen])

  useEffect(() => {
    appDispatch(marketApi.endpoints.findByAssetId.initiate(stakingAssetId))
  }, [appDispatch, stakingAssetId])

  const currentApyQuery = useCurrentApyQuery({ stakingAssetId })

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const assets = useAppSelector(selectAssets)
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const rewardAssetId = useMemo(
    () => getRfoxStakingConfig(stakingAssetId).rewardAssetId,
    [stakingAssetId],
  )
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId))

  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )
  const rewardAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, rewardAssetId),
  )

  const stakingAssetAccountId = useMemo(() => {
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[assetAccountNumber]
    const matchingAccountId = accountNumberAccountIds?.[getRfoxChainId(stakingAssetId)]
    return matchingAccountId
  }, [accountIdsByAccountNumberAndChainId, assetAccountNumber, stakingAssetId])

  const allUnstakingRequestsQuery = useGetUnstakingRequestsQuery()

  const { hasPositionByStakingAssetId } = useRfoxPositionsQuery({
    accountNumber: isConnected ? assetAccountNumber : undefined,
  })

  const pauseStateQuery = useRfoxPauseStateQuery(stakingAssetId)
  const pauseState = useMemo(() => selectPauseState(pauseStateQuery.data), [pauseStateQuery.data])

  // Sunset programs are only surfaced while the user still has something to unstake or claim in
  // them, so they fall away on their own once drained. Current programs are always surfaced, paused
  // or not - a paused program disables its actions rather than disappearing.
  const visibleStakingAssetIds = useMemo(
    () =>
      RFOX_STAKING_ASSET_IDS.filter(
        candidateStakingAssetId =>
          !RFOX_STAKING_CONFIG[candidateStakingAssetId].isLegacy ||
          hasPositionByStakingAssetId[candidateStakingAssetId],
      ),
    [hasPositionByStakingAssetId],
  )

  useEffect(() => {
    if (visibleStakingAssetIds.includes(stakingAssetId)) return
    if (!visibleStakingAssetIds.length) return

    setStakingAssetId(visibleStakingAssetIds[0])
    setContextStakingAssetId(visibleStakingAssetIds[0])
  }, [setContextStakingAssetId, stakingAssetId, visibleStakingAssetIds])

  const filters = useMemo<Filter[]>(
    () =>
      visibleStakingAssetIds.map(candidateStakingAssetId => {
        const asset = assets[candidateStakingAssetId]

        return {
          label: asset?.symbol ?? '',
          chainId: asset?.chainId,
          assetId: candidateStakingAssetId,
          asset,
        }
      }),
    [assets, visibleStakingAssetIds],
  )

  const hasLpPosition = hasPositionByStakingAssetId[uniV2EthFoxArbitrumAssetId]

  const isMigrationBannerVisible = useMemo(
    () => visibleStakingAssetIds.includes(foxOnArbitrumOneAssetId),
    [visibleStakingAssetIds],
  )

  const migrationTradeUrl = useMemo(() => {
    const [buyChainId, buyAssetSubId] = foxAssetId.split('/')
    const [sellChainId, sellAssetSubId] = foxOnArbitrumOneAssetId.split('/')

    return `/trade/${buyChainId}/${buyAssetSubId}/${sellChainId}/${sellAssetSubId}/0`
  }, [])

  const hasClaimableRequests = useMemo(() => {
    const accountRequests = allUnstakingRequestsQuery.data?.byAccountId[stakingAssetAccountId ?? '']
    if (!accountRequests?.length) return false

    return accountRequests.some(request => {
      if (request.stakingAssetId !== stakingAssetId) return false

      const currentTimestampMs = Date.now()
      const unstakingTimestampMs = Number(request.cooldownExpiry) * 1000
      return currentTimestampMs >= unstakingTimestampMs
    })
  }, [allUnstakingRequestsQuery.data?.byAccountId, stakingAssetAccountId, stakingAssetId])

  useEffect(() => {
    if (selectedUnstakingRequest) return

    setStakingAssetAccountId(stakingAssetAccountId)
  }, [selectedUnstakingRequest, setStakingAssetAccountId, stakingAssetAccountId])

  const selectStakingBalanceCryptoPrecision = useCallback(
    (abiStakingInfo: AbiStakingInfo) => {
      const stakingBalanceCryptoBaseUnit = selectStakingBalance(abiStakingInfo)
      return BigAmount.fromBaseUnit({
        value: stakingBalanceCryptoBaseUnit.toString(),
        precision: stakingAsset?.precision ?? 0,
      }).toPrecision()
    },
    [stakingAsset],
  )

  const stakingBalanceCryptoPrecisionQuery = useStakingInfoQuery({
    stakingAssetId,
    accountId: isConnected ? stakingAssetAccountId : undefined,
    select: selectStakingBalanceCryptoPrecision,
  })

  const stakingBalanceUserCurrency = useMemo(() => {
    if (!stakingAssetMarketData?.price) return '0'
    if (!stakingBalanceCryptoPrecisionQuery.data) return '0'

    return bnOrZero(stakingBalanceCryptoPrecisionQuery.data)
      .times(bnOrZero(stakingAssetMarketData.price))
      .toFixed(2)
  }, [stakingBalanceCryptoPrecisionQuery.data, stakingAssetMarketData?.price])

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const currentEpochRewardsQuery = useCurrentEpochRewardsQuery({
    stakingAssetId,
    stakingAssetAccountId: isConnected ? stakingAssetAccountId : undefined,
    currentEpochMetadata: currentEpochMetadataQuery.data,
  })

  const currentEpochRewardsCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: currentEpochRewardsQuery.data?.toString(),
        precision: rewardAsset?.precision ?? 0,
      }).toPrecision(),
    [currentEpochRewardsQuery.data, rewardAsset?.precision],
  )

  const currentEpochRewardsUserCurrency = useMemo(() => {
    if (!rewardAssetMarketData?.price) return '0'
    if (!currentEpochRewardsCryptoPrecision) return '0'

    return bnOrZero(currentEpochRewardsCryptoPrecision)
      .times(bnOrZero(rewardAssetMarketData.price))
      .toFixed(2)
  }, [currentEpochRewardsCryptoPrecision, rewardAssetMarketData?.price])

  const lifetimeRewardsUserCurrencyQuery = useLifetimeRewardsUserCurrencyQuery({
    stakingAssetId,
    stakingAssetAccountId: isConnected ? stakingAssetAccountId : undefined,
  })

  const {
    data: timeInPoolHuman,
    isLoading: isTimeInPoolQueryLoading,
    isFetching: isTimeInPoolFetching,
  } = useTimeInPoolQuery({
    stakingAssetId,
    stakingAssetAccountId: isConnected ? stakingAssetAccountId : undefined,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const handleSelectAssetId = useCallback(
    (filter: Filter) => {
      const assetId = filter.assetId ?? foxAssetId
      setStakingAssetId(assetId)
      setContextStakingAssetId(assetId)
    },
    [setContextStakingAssetId],
  )

  const isTimeInPoolLoading = useMemo(() => {
    return isTimeInPoolQueryLoading || isTimeInPoolFetching
  }, [isTimeInPoolQueryLoading, isTimeInPoolFetching])

  const handleStakeClick = useCallback(() => {
    setIsStakeModalOpen(true)
  }, [])

  const handleUnstakeClick = useCallback(() => {
    setIsUnstakeModalOpen(true)
  }, [])

  const handleClaimClick = useCallback(() => {
    setIsClaimModalOpen(true)
  }, [])

  const handleCloseStakeModal = useCallback(() => {
    setIsStakeModalOpen(false)
  }, [])

  const handleCloseUnstakeModal = useCallback(() => {
    setIsUnstakeModalOpen(false)
  }, [])

  const handleCloseClaimModal = useCallback(() => {
    setIsClaimModalOpen(false)
  }, [])

  const actionsButtons = useMemo(() => {
    return (
      <Flex flexWrap='wrap' gap={2}>
        <Tooltip
          label={translate('RFOX.stakingPausedTooltip')}
          isDisabled={!pauseState.isStakingPaused}
          shouldWrapChildren
        >
          <Button
            data-testid='rfox-stake-button'
            onClick={handleStakeClick}
            colorScheme='gray'
            flex='1 1 auto'
            leftIcon={tbArrowUp}
            isDisabled={pauseState.isStakingPaused}
          >
            {translate('defi.stake')}
          </Button>
        </Tooltip>
        <Tooltip
          label={translate('RFOX.unstakingPausedTooltip')}
          isDisabled={!pauseState.isUnstakingPaused}
          shouldWrapChildren
        >
          <Button
            data-testid='rfox-unstake-button'
            onClick={handleUnstakeClick}
            colorScheme='gray'
            flex='1 1 auto'
            leftIcon={tbArrowDown}
            isDisabled={pauseState.isUnstakingPaused}
          >
            {translate('defi.unstake')}
          </Button>
        </Tooltip>
        <Tooltip
          label={translate('RFOX.withdrawalsPausedTooltip')}
          isDisabled={!pauseState.isWithdrawalsPaused}
          shouldWrapChildren
        >
          <Button
            data-testid='rfox-claim-button'
            onClick={handleClaimClick}
            colorScheme='green'
            flex='1 1 auto'
            isDisabled={!hasClaimableRequests || pauseState.isWithdrawalsPaused}
          >
            {translate('defi.claim')}
          </Button>
        </Tooltip>
      </Flex>
    )
  }, [
    handleStakeClick,
    handleUnstakeClick,
    handleClaimClick,
    translate,
    hasClaimableRequests,
    pauseState,
  ])

  if (!(stakingAsset && rewardAsset)) return null

  return (
    <Box>
      <Divider mt={2} mb={6} />
      {isMigrationBannerVisible && (
        <Card borderColor='blue.500' borderWidth={1} borderRadius='lg' mb={2}>
          <CardBody py={3} px={4}>
            <Flex alignItems='center' gap={3} flexWrap='wrap'>
              <Icon as={TbAlertTriangle} boxSize={6} color='blue.300' />
              <Box flex='1 1 auto'>
                <CText fontWeight='bold'>{translate('RFOX.migrationBannerTitle')}</CText>
                <CText fontSize='sm' color='text.subtle'>
                  {translate('RFOX.migrationBannerDescription')}
                </CText>
              </Box>
              <Button as={RouterLink} to={migrationTradeUrl} colorScheme='blue' size='sm'>
                {translate('RFOX.migrationBannerCta')}
              </Button>
            </Flex>
          </CardBody>
        </Card>
      )}
      {hasLpPosition && (
        <Card bg='yellow.500' borderColor='yellow.600' borderWidth={1} borderRadius='lg'>
          <CardBody py={2} px={4}>
            <Flex alignItems='center' gap={2}>
              <Icon as={TbAlertTriangle} boxSize={6} color='black' />
              <Box>
                <CText fontWeight='bold' color='black'>
                  {translate('RFOX.lpSunsetWarningTitle')}
                </CText>
                <CText fontSize='sm' color='black'>
                  {translate('RFOX.lpSunsetWarningDescription')}
                </CText>
              </Box>
            </Flex>
          </CardBody>
        </Card>
      )}
      <Box py={4} px={containerPaddingX} id='rfox' data-testid='rfox-section'>
        <Flex sx={headerSx}>
          <Box mb={headerTitleMb}>
            <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
              <RFOXIcon me={2} boxSize='32px' sx={rfoxIconStyles} />
              {translate('RFOX.staking')}
              <Skeleton isLoaded={!currentApyQuery.isFetching} ml={2}>
                <Tag colorScheme='green' verticalAlign='middle'>
                  <Amount.Percent value={currentApyQuery.data ?? 0} suffix='APY' />
                </Tag>
              </Skeleton>
            </Heading>
            {filters.length > 1 ? (
              <ButtonGroup variant='transparent' mb={4} spacing={0} mt={2}>
                <HStack spacing={1} p={1} borderRadius='md' {...hstackProps}>
                  {filters.map(filter => (
                    <FoxTokenFilterButton
                      key={filter.label}
                      onFilterClick={handleSelectAssetId}
                      filter={filter}
                      isSelected={stakingAssetId === filter.assetId}
                      asset={filter.asset}
                    />
                  ))}
                </HStack>
              </ButtonGroup>
            ) : null}
          </Box>

          <Card width='100%' maxWidth='400px'>
            <CardBody py={4} px={4}>
              <Text fontSize='md' color='text.subtle' translation='RFOX.pendingRewardsBalance' />

              <Skeleton isLoaded={!currentEpochRewardsQuery.isLoading}>
                <Amount.Crypto
                  value={currentEpochRewardsCryptoPrecision}
                  symbol={rewardAsset.symbol ?? ''}
                />
              </Skeleton>
              <Amount.Fiat
                fontSize='xs'
                value={currentEpochRewardsUserCurrency}
                color='text.subtle'
              />
            </CardBody>
          </Card>
        </Flex>

        <SimpleGrid my={4} columns={columnsProps} spacing='26px' width='100%' mb={8}>
          <Stack
            {...stackProps}
            alignItems='center'
            flexDir='row'
            justifyContent='space-between'
            flexWrap='wrap'
            gap={4}
          >
            <Box>
              <Text
                fontSize='md'
                color='text.subtle'
                fontWeight='medium'
                translation='defi.stakingBalance'
                mb={1}
              />
              <Skeleton isLoaded={!stakingBalanceCryptoPrecisionQuery.isLoading}>
                <Amount.Crypto
                  fontSize='2xl'
                  value={stakingBalanceCryptoPrecisionQuery.data}
                  symbol={stakingAsset.symbol ?? ''}
                />
              </Skeleton>
              <Amount.Fiat fontSize='xs' value={stakingBalanceUserCurrency} color='text.subtle' />
            </Box>
            {actionsButtons}
          </Stack>

          <Stack {...stackProps}>
            <Text
              fontSize='md'
              color='text.subtle'
              fontWeight='medium'
              translation='RFOX.lifetimeRewards'
              mb={1}
            />
            <Skeleton isLoaded={!lifetimeRewardsUserCurrencyQuery.isLoading}>
              <Amount.Fiat fontSize='2xl' value={lifetimeRewardsUserCurrencyQuery.data} />
            </Skeleton>
          </Stack>

          <Stack {...stackProps}>
            <Text
              fontSize='md'
              color='text.subtle'
              fontWeight='medium'
              translation='RFOX.timeInPool'
              mb={1}
            />
            <Skeleton isLoaded={!Boolean(isTimeInPoolLoading)}>
              <CText fontSize='2xl'>{timeInPoolHuman ?? 'N/A'}</CText>
            </Skeleton>
          </Stack>
        </SimpleGrid>
        <RFOXSimulator stakingAssetId={stakingAssetId} />
        <Box py={4}>
          <Stats />
        </Box>
      </Box>
      <StakeModal isOpen={isStakeModalOpen} onClose={handleCloseStakeModal} />
      <UnstakeModal isOpen={isUnstakeModalOpen} onClose={handleCloseUnstakeModal} />
      <ClaimModal isOpen={isClaimModalOpen} onClose={handleCloseClaimModal} />
    </Box>
  )
}
