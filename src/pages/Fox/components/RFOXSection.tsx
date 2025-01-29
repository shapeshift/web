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
} from '@chakra-ui/react'
import {
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
  thorchainAssetId,
  uniV2EthFoxArbitrumAssetId,
} from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { RFOXIcon } from 'components/Icons/RFOX'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { formatSecondsToDuration } from 'lib/utils/time'
import { getStakingContract, selectStakingBalance } from 'pages/RFOX/helpers'
import { useAffiliateRevenueQuery } from 'pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentApyQuery } from 'pages/RFOX/hooks/useCurrentApyQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from 'pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useLifetimeRewardsQuery } from 'pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { useTimeInPoolQuery } from 'pages/RFOX/hooks/useTimeInPoolQuery'
import type { AbiStakingInfo } from 'pages/RFOX/types'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useFoxPageContext } from '../hooks/useFoxPageContext'
import type { Filter } from './FoxTokenFilterButton'
import { FoxTokenFilterButton } from './FoxTokenFilterButton'
import { RFOXSimulator } from './RFOXSimulator'

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
  const history = useHistory()
  const isRFOXEnabled = useFeatureFlag('FoxPageRFOX')
  const isRFOXLPEnabled = useFeatureFlag('RFOX_LP')
  const { assetAccountNumber } = useFoxPageContext()
  const { setStakingAssetAccountId } = useRFOXContext()
  const appDispatch = useAppDispatch()
  const [stakingAssetId, setStakingAssetId] = useState(foxOnArbitrumOneAssetId)

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  useEffect(() => {
    appDispatch(marketApi.endpoints.findByAssetId.initiate(stakingAssetId))
  }, [appDispatch, stakingAssetId])

  const currentApyQuery = useCurrentApyQuery({ stakingAssetId })

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
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

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const handleManageClick = useCallback(() => {
    setStakingAssetAccountId(stakingAssetAccountId)
    history.push({
      pathname: '/rfox',
    })
  }, [history, stakingAssetAccountId, setStakingAssetAccountId])

  const selectStakingBalanceCryptoPrecision = useCallback(
    (abiStakingInfo: AbiStakingInfo) => {
      const stakingBalanceCryptoBaseUnit = selectStakingBalance(abiStakingInfo)
      return fromBaseUnit(stakingBalanceCryptoBaseUnit.toString(), stakingAsset?.precision ?? 0)
    },
    [stakingAsset],
  )

  const stakingBalanceCryptoPrecisionQuery = useStakingInfoQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
    select: selectStakingBalanceCryptoPrecision,
  })

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const currentEpochRewardsQuery = useCurrentEpochRewardsQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
    currentEpochMetadata: currentEpochMetadataQuery.data,
  })

  const currentEpochRewardsCryptoPrecision = useMemo(
    () => fromBaseUnit(currentEpochRewardsQuery.data?.toString(), runeAsset?.precision ?? 0),
    [currentEpochRewardsQuery.data, runeAsset?.precision],
  )

  const lifetimeRewardsQuery = useLifetimeRewardsQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
  })

  const {
    data: timeInPoolHuman,
    isLoading: isTimeInPoolQueryLoading,
    isFetching: isTimeInPoolFetching,
  } = useTimeInPoolQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const handleSelectAssetId = useCallback((filter: Filter) => {
    setStakingAssetId(filter.assetId ?? foxOnArbitrumOneAssetId)
  }, [])

  const isTimeInPoolLoading = useMemo(() => {
    return isTimeInPoolQueryLoading || isTimeInPoolFetching
  }, [isTimeInPoolQueryLoading, isTimeInPoolFetching])

  const affiliateRevenueQuery = useAffiliateRevenueQuery<string>({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
    select: (totalRevenue: bigint) => {
      return bn(fromBaseUnit(totalRevenue.toString(), runeAsset?.precision ?? 0))
        .times(runeMarketData.price)
        .toFixed(2)
    },
  })

  const emissionsPoolUserCurrency = useMemo(() => {
    if (!affiliateRevenueQuery.data) return
    if (!currentEpochMetadataQuery.data) return

    const distributionRate =
      currentEpochMetadataQuery.data.distributionRateByStakingContract[
        getStakingContract(stakingAssetId)
      ]

    return bn(affiliateRevenueQuery.data).times(distributionRate).toFixed(2)
  }, [affiliateRevenueQuery, currentEpochMetadataQuery, stakingAssetId])

  if (!(stakingAsset && runeAsset)) return null

  if (!isRFOXEnabled) return null

  return (
    <>
      <Divider mt={2} mb={6} />
      <Box py={4} px={containerPaddingX}>
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

              <Skeleton isLoaded={!currentEpochRewardsQuery.isFetching}>
                <Amount.Crypto
                  value={currentEpochRewardsCryptoPrecision}
                  symbol={runeAsset.symbol ?? ''}
                />
              </Skeleton>
            </CardBody>
          </Card>
        </Flex>

        <SimpleGrid my={4} columns={columnsProps} spacing='26px' width='100%' mb={8}>
          <Stack {...stackProps} alignItems='center' flexDir='row' justifyContent='space-between'>
            <Box>
              <Text
                fontSize='md'
                color='text.subtle'
                fontWeight='medium'
                translation='defi.stakingBalance'
                mb={1}
              />
              <Skeleton isLoaded={!stakingBalanceCryptoPrecisionQuery.isFetching}>
                <Amount.Crypto
                  fontSize='2xl'
                  value={stakingBalanceCryptoPrecisionQuery.data}
                  symbol={stakingAsset.symbol ?? ''}
                />
              </Skeleton>
            </Box>
            <Button onClick={handleManageClick} colorScheme='gray' size='sm'>
              {translate('common.manage')}
            </Button>
          </Stack>

          <Stack {...stackProps}>
            <Text
              fontSize='md'
              color='text.subtle'
              fontWeight='medium'
              translation='RFOX.lifetimeRewards'
              mb={1}
            />
            <Skeleton isLoaded={!Boolean(lifetimeRewardsQuery.isFetching)}>
              <Amount.Crypto
                fontSize='2xl'
                value={fromBaseUnit(
                  lifetimeRewardsQuery.data?.toString(),
                  runeAsset.precision ?? 0,
                )}
                symbol={runeAsset.symbol ?? ''}
              />
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

          <Stack {...stackProps}>
            <Text
              fontSize='md'
              color='text.subtle'
              fontWeight='medium'
              // we need to pass a local scope arg here, so we need an anonymous function wrapper
              // eslint-disable-next-line react-memo/require-usememo
              translation={[
                'foxPage.rfox.totalSymbolBurn',
                {
                  symbol: stakingAsset.symbol,
                },
              ]}
              mb={1}
            />
            <Skeleton isLoaded={Boolean(emissionsPoolUserCurrency)}>
              <Amount.Fiat fontSize='2xl' value={emissionsPoolUserCurrency} suffix='🔥 _ 🔥' />
            </Skeleton>
          </Stack>
        </SimpleGrid>
        <RFOXSimulator stakingAssetId={stakingAssetId} />
      </Box>
    </>
  )
}
