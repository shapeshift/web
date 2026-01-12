import {
  Avatar,
  Box,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { FaClock, FaGasPump, FaLayerGroup, FaMoneyBillWave, FaUserShield } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import type {
  AugmentedYieldBalanceWithAccountId,
  NormalizedYieldBalances,
} from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const layerGroupIcon = <Icon as={FaLayerGroup} />
const userShieldIcon = <Icon as={FaUserShield} />
const clockIcon = <Icon as={FaClock} />
const gasPumpIcon = <Icon as={FaGasPump} />
const moneyBillWaveIcon = <Icon as={FaMoneyBillWave} />

type YieldStatsProps = {
  yieldItem: AugmentedYieldDto
  balances?: NormalizedYieldBalances
}

export const YieldStats = memo(({ yieldItem, balances }: YieldStatsProps) => {
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const inputTokenAssetId = yieldItem.inputTokens[0]?.assetId ?? ''
  const inputTokenMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId),
  )

  const [searchParams] = useSearchParams()
  const validatorParam = useMemo(() => searchParams.get('validator'), [searchParams])

  const shouldFetchValidators = useMemo(
    () => yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection,
    [yieldItem.mechanics.type, yieldItem.mechanics.requiresValidatorSelection],
  )
  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  const defaultValidator = useMemo(() => {
    if (yieldItem.chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId])
      return DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]
    return validators?.[0]?.address
  }, [yieldItem.chainId, validators])

  const selectedValidatorAddress = useMemo(
    () => validatorParam || defaultValidator,
    [validatorParam, defaultValidator],
  )

  const selectedValidator = useMemo(() => {
    if (!selectedValidatorAddress) return undefined
    const inList = validators?.find(v => v.address === selectedValidatorAddress)
    if (inList) return inList
    const inBalances = balances?.raw.find(
      (b: AugmentedYieldBalanceWithAccountId) => b.validator?.address === selectedValidatorAddress,
    )?.validator
    if (inBalances) return inBalances
    return undefined
  }, [validators, selectedValidatorAddress, balances])

  const tvl = useMemo(() => {
    const validatorTvl =
      selectedValidator && 'tvl' in selectedValidator ? selectedValidator.tvl : undefined
    return bnOrZero(yieldItem.statistics?.tvl ?? validatorTvl).toNumber()
  }, [selectedValidator, yieldItem.statistics?.tvl])

  const tvlUserCurrency = useMemo(() => {
    if (yieldItem.statistics?.tvlUsd) {
      return bnOrZero(yieldItem.statistics.tvlUsd).times(userCurrencyToUsdRate).toFixed()
    }
    return bnOrZero(tvl)
      .times(bnOrZero(inputTokenMarketData?.price))
      .toFixed()
  }, [yieldItem.statistics?.tvlUsd, userCurrencyToUsdRate, tvl, inputTokenMarketData?.price])

  const apy = useMemo(
    () =>
      bnOrZero(
        selectedValidator && 'rewardRate' in selectedValidator && selectedValidator.rewardRate
          ? selectedValidator.rewardRate.total
          : yieldItem.rewardRate.total,
      )
        .times(100)
        .toNumber(),
    [selectedValidator, yieldItem.rewardRate.total],
  )

  const validatorMetadata = useMemo(() => {
    if (yieldItem.mechanics.type !== 'staking') return null
    if (selectedValidator)
      return { name: selectedValidator.name, logoURI: selectedValidator.logoURI }
    return null
  }, [yieldItem.mechanics.type, selectedValidator])

  const apyFormatted = useMemo(() => apy.toFixed(2), [apy])
  const tvlFormatted = useMemo(() => tvl.toFixed(), [tvl])

  const rewardBreakdownContent = useMemo(() => {
    if (yieldItem.rewardRate.components.length === 0) return null
    return (
      <Flex
        direction='column'
        gap={2}
        mt={3}
        p={3}
        bg='background.surface.raised.base'
        borderRadius='md'
      >
        {yieldItem.rewardRate.components.map((component, idx) => (
          <Flex key={idx} justifyContent='space-between' alignItems='center'>
            <Flex alignItems='center' gap={2}>
              <Box w={1.5} h={1.5} borderRadius='full' bg='green.400' />
              <Text fontSize='xs' color='text.subtle' textTransform='capitalize'>
                {component.yieldSource}
              </Text>
            </Flex>
            <Text fontSize='xs' fontWeight='bold' color='green.300'>
              {bnOrZero(component.rate).times(100).toFixed(2)}%
            </Text>
          </Flex>
        ))}
      </Flex>
    )
  }, [yieldItem.rewardRate.components])

  const validatorRowContent = useMemo(() => {
    if (!validatorMetadata) return null
    return (
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex alignItems='center' gap={2} color='text.subtle'>
          {userShieldIcon}
          <Text fontSize='sm'>{translate('yieldXYZ.validator')}</Text>
        </Flex>
        <Flex alignItems='center' gap={2}>
          {validatorMetadata.logoURI && (
            <Avatar size='xs' src={validatorMetadata.logoURI} name={validatorMetadata.name} />
          )}
          <Text fontSize='sm' fontWeight='medium'>
            {validatorMetadata.name}
          </Text>
        </Flex>
      </Flex>
    )
  }, [validatorMetadata, translate])

  const minDepositRowContent = useMemo(() => {
    if (!yieldItem.mechanics.entryLimits.minimum) return null
    return (
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex alignItems='center' gap={2} color='text.subtle'>
          {moneyBillWaveIcon}
          <Text fontSize='sm'>{translate('yieldXYZ.minEnter')}</Text>
        </Flex>
        <Amount.Crypto
          value={yieldItem.mechanics.entryLimits.minimum}
          symbol={yieldItem.token.symbol}
          fontSize='sm'
          fontWeight='medium'
        />
      </Flex>
    )
  }, [yieldItem.mechanics.entryLimits.minimum, yieldItem.token.symbol, translate])

  return (
    <Card variant='dashboard'>
      <CardBody p={6}>
        <Heading
          as='h3'
          size='sm'
          mb={6}
          textTransform='uppercase'
          color='text.subtle'
          letterSpacing='wider'
        >
          {translate('yieldXYZ.stats')}
        </Heading>
        <Flex direction='column' gap={6}>
          <Box>
            <Tooltip label={translate('common.apy')}>
              <Stat>
                <StatLabel fontSize='xs' color='text.subtle' mb={1}>
                  {translate('common.apy')}
                </StatLabel>
                <StatNumber
                  bgGradient='linear(to-r, green.300, blue.400)'
                  bgClip='text'
                  fontSize='3xl'
                  fontWeight='800'
                >
                  {apyFormatted}%
                  <Text as='span' fontSize='sm' fontWeight='normal' ml={1} color='text.subtle'>
                    {yieldItem.rewardRate.rateType}
                  </Text>
                </StatNumber>
              </Stat>
            </Tooltip>
            {rewardBreakdownContent}
          </Box>
          <Divider borderColor='border.base' />
          <Stat>
            <StatLabel fontSize='xs' color='text.subtle' mb={1}>
              {translate('yieldXYZ.tvl')}
            </StatLabel>
            <StatNumber fontSize='xl' fontWeight='bold'>
              <Amount.Fiat value={tvlUserCurrency} abbreviated />
            </StatNumber>
            <Text fontSize='xs' color='text.subtle' mt={1}>
              <Amount.Crypto value={tvlFormatted} symbol={yieldItem.token.symbol} abbreviated />
            </Text>
          </Stat>
          <Box pt={2}>
            <Flex direction='column' gap={4}>
              <Flex justifyContent='space-between' alignItems='center'>
                <Flex alignItems='center' gap={2} color='text.subtle'>
                  {layerGroupIcon}
                  <Text fontSize='sm'>{translate('yieldXYZ.type')}</Text>
                </Flex>
                <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                  {yieldItem.mechanics.type}
                </Text>
              </Flex>
              {validatorRowContent}
              <Flex justifyContent='space-between' alignItems='center'>
                <Flex alignItems='center' gap={2} color='text.subtle'>
                  {clockIcon}
                  <Text fontSize='sm'>{translate('yieldXYZ.rewardSchedule')}</Text>
                </Flex>
                <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                  {yieldItem.mechanics.rewardSchedule}
                </Text>
              </Flex>
              <Flex justifyContent='space-between' alignItems='center'>
                <Flex alignItems='center' gap={2} color='text.subtle'>
                  {gasPumpIcon}
                  <Text fontSize='sm'>{translate('yieldXYZ.gasToken')}</Text>
                </Flex>
                <Text fontSize='sm' fontWeight='medium'>
                  {yieldItem.mechanics.gasFeeToken.symbol}
                </Text>
              </Flex>
              {minDepositRowContent}
            </Flex>
          </Box>
        </Flex>
      </CardBody>
    </Card>
  )
})
