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
  SimpleGrid,
  Skeleton,
  Stack,
  Tag,
  Text as CText,
  usePrevious,
} from '@chakra-ui/react'
import {
  foxOnArbitrumOneAssetId,
  fromAssetId,
  thorchainAssetId,
  uniV2EthFoxArbitrumAssetId,
} from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbArrowDown, TbArrowUp } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { RFOXIcon } from '@/components/Icons/RFOX'
import { Text } from '@/components/Text'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { formatSecondsToDuration } from '@/lib/utils/time'
import type { Filter } from '@/pages/Fox/components/FoxTokenFilterButton'
import { FoxTokenFilterButton } from '@/pages/Fox/components/FoxTokenFilterButton'
import { RFOXSimulator } from '@/pages/Fox/components/RFOXSimulator'
import { useFoxPageContext } from '@/pages/Fox/hooks/useFoxPageContext'
import { ClaimModal } from '@/pages/RFOX/components/ClaimModal'
import { Stats } from '@/pages/RFOX/components/Overview/Stats'
import { StakeModal } from '@/pages/RFOX/components/StakeModal'
import { UnstakeModal } from '@/pages/RFOX/components/UnstakeModal'
import { selectStakingBalance } from '@/pages/RFOX/helpers'
import { useCurrentApyQuery } from '@/pages/RFOX/hooks/useCurrentApyQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from '@/pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'
import { useLifetimeRewardsQuery } from '@/pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { useTimeInPoolQuery } from '@/pages/RFOX/hooks/useTimeInPoolQuery'
import type { AbiStakingInfo } from '@/pages/RFOX/types'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
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
  const translate = useTranslate()
  const navigate = useNavigate()
  const isRFOXEnabled = useFeatureFlag('FoxPageRFOX')
  const isRFOXFoxEcosystemPageEnabled = useFeatureFlag('RfoxFoxEcosystemPage')
  const isRFOXLPEnabled = useFeatureFlag('RFOX_LP')
  const { assetAccountNumber } = useFoxPageContext()
  const { setStakingAssetAccountId } = useRFOXContext()
  const appDispatch = useAppDispatch()
  const location = useLocation()
  const selectedUnstakingRequest = location.state?.selectedUnstakingRequest as
    | UnstakingRequest
    | undefined

  const {
    state: { isConnected: isWalletConnected },
  } = useWallet()
  const walletType = useAppSelector(selectWalletType)
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger
  const isConnected = isWalletConnected || isLedgerReadOnly

  const [stakingAssetId, setStakingAssetId] = useState(foxOnArbitrumOneAssetId)
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

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const foxOnArbAsset = useAppSelector(state => selectAssetById(state, foxOnArbitrumOneAssetId))
  const foxLpAsset = useAppSelector(state => selectAssetById(state, uniV2EthFoxArbitrumAssetId))

  const filters = useMemo<Filter[]>(() => {
    return [
      {
        label: foxOnArbAsset?.symbol ?? '',
        chainId: foxOnArbAsset?.chainId,
        assetId: foxOnArbitrumOneAssetId,
        asset: foxOnArbAsset,
      },
      {
        label: foxLpAsset?.symbol ?? '',
        chainId: foxLpAsset?.chainId,
        assetId: uniV2EthFoxArbitrumAssetId,
        asset: foxLpAsset,
      },
    ]
  }, [foxLpAsset, foxOnArbAsset])

  const stakingAssetAccountId = useMemo(() => {
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[assetAccountNumber]
    const matchingAccountId = accountNumberAccountIds?.[fromAssetId(stakingAssetId).chainId]
    return matchingAccountId
  }, [accountIdsByAccountNumberAndChainId, assetAccountNumber, stakingAssetId])

  useEffect(() => {
    if (selectedUnstakingRequest) return

    setStakingAssetAccountId(stakingAssetAccountId)
  }, [selectedUnstakingRequest, setStakingAssetAccountId, stakingAssetAccountId])

  const handleManageClick = useCallback(() => {
    navigate({
      pathname: '/rfox',
    })
  }, [navigate])

  const selectStakingBalanceCryptoPrecision = useCallback(
    (abiStakingInfo: AbiStakingInfo) => {
      const stakingBalanceCryptoBaseUnit = selectStakingBalance(abiStakingInfo)
      return fromBaseUnit(stakingBalanceCryptoBaseUnit.toString(), stakingAsset?.precision ?? 0)
    },
    [stakingAsset],
  )

  const stakingBalanceCryptoPrecisionQuery = useStakingInfoQuery({
    stakingAssetId,
    accountId: stakingAssetAccountId,
    select: selectStakingBalanceCryptoPrecision,
  })

  const stakingBalanceUserCurrency = useMemo(() => {
    if (!isConnected) return '0'
    if (!stakingAssetMarketData?.price) return '0'
    if (!stakingBalanceCryptoPrecisionQuery.data) return '0'

    return bnOrZero(stakingBalanceCryptoPrecisionQuery.data)
      .times(bnOrZero(stakingAssetMarketData.price))
      .toFixed(2)
  }, [isConnected, stakingBalanceCryptoPrecisionQuery.data, stakingAssetMarketData?.price])

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const currentEpochRewardsQuery = useCurrentEpochRewardsQuery({
    stakingAssetId,
    stakingAssetAccountId,
    currentEpochMetadata: currentEpochMetadataQuery.data,
  })

  const currentEpochRewardsCryptoPrecision = useMemo(
    () => isConnected ? fromBaseUnit(currentEpochRewardsQuery.data?.toString(), runeAsset?.precision ?? 0) : '0',
    [isConnected, currentEpochRewardsQuery.data, runeAsset?.precision],
  )

  const currentEpochRewardsUserCurrency = useMemo(() => {
    if (!isConnected) return '0'
    if (!runeMarketData?.price) return '0'
    if (!currentEpochRewardsCryptoPrecision) return '0'

    return bnOrZero(currentEpochRewardsCryptoPrecision)
      .times(bnOrZero(runeMarketData.price))
      .toFixed(2)
  }, [isConnected, currentEpochRewardsCryptoPrecision, runeMarketData?.price])

  const lifetimeRewardsQuery = useLifetimeRewardsQuery({
    stakingAssetId,
    stakingAssetAccountId,
  })

  const lifetimeRewardsCryptoPrecision = useMemo(
    () => isConnected ? fromBaseUnit(lifetimeRewardsQuery.data?.toString(), runeAsset?.precision ?? 0) : '0',
    [isConnected, lifetimeRewardsQuery.data, runeAsset?.precision],
  )

  const lifetimeRewardsUserCurrency = useMemo(() => {
    if (!isConnected) return '0'
    if (!runeMarketData?.price) return '0'
    if (!lifetimeRewardsCryptoPrecision) return '0'

    return bnOrZero(lifetimeRewardsCryptoPrecision).times(bnOrZero(runeMarketData.price)).toFixed(2)
  }, [isConnected, lifetimeRewardsCryptoPrecision, runeMarketData?.price])

  const {
    data: timeInPoolHuman,
    isLoading: isTimeInPoolQueryLoading,
    isFetching: isTimeInPoolFetching,
  } = useTimeInPoolQuery({
    stakingAssetId,
    stakingAssetAccountId,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  // Derived values that respect isConnected to prevent phantom balances
  const displayStakingBalanceCryptoPrecision = isConnected ? stakingBalanceCryptoPrecisionQuery.data : '0'
  const displayTimeInPoolHuman = isConnected ? (timeInPoolHuman ?? 'N/A') : 'N/A'

  const handleSelectAssetId = useCallback((filter: Filter) => {
    setStakingAssetId(filter.assetId ?? foxOnArbitrumOneAssetId)
  }, [])

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
    if (!isRFOXFoxEcosystemPageEnabled) {
      return (
        <Button onClick={handleManageClick} colorScheme='gray'>
          {translate('common.manage')}
        </Button>
      )
    }

    return (
      <Flex flexWrap='wrap' gap={2}>
        <Button onClick={handleStakeClick} colorScheme='gray' flex='1 1 auto' leftIcon={tbArrowUp}>
          {translate('defi.stake')}
        </Button>
        <Button
          onClick={handleUnstakeClick}
          colorScheme='gray'
          flex='1 1 auto'
          leftIcon={tbArrowDown}
        >
          {translate('defi.unstake')}
        </Button>
        <Button onClick={handleClaimClick} colorScheme='green' flex='1 1 auto'>
          {translate('defi.claim')}
        </Button>
      </Flex>
    )
  }, [
    isRFOXFoxEcosystemPageEnabled,
    handleManageClick,
    handleStakeClick,
    handleUnstakeClick,
    handleClaimClick,
    translate,
  ])

  if (!(stakingAsset && runeAsset)) return null

  if (!isRFOXEnabled) return null

  return (
    <Box>
      <Divider mt={2} mb={6} />
      <Box py={4} px={containerPaddingX} id='rfox'>
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
            {isRFOXLPEnabled ? (
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
                  symbol={runeAsset.symbol ?? ''}
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
                  value={displayStakingBalanceCryptoPrecision}
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
            <Skeleton isLoaded={!lifetimeRewardsQuery.isLoading}>
              <Amount.Crypto
                fontSize='2xl'
                value={lifetimeRewardsCryptoPrecision}
                symbol={runeAsset.symbol ?? ''}
              />
            </Skeleton>
            <Amount.Fiat fontSize='xs' value={lifetimeRewardsUserCurrency} color='text.subtle' />
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
              <CText fontSize='2xl'>{displayTimeInPoolHuman}</CText>
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
