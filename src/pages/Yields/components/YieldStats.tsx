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
  useColorModeValue,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaClock, FaGasPump, FaLayerGroup, FaMoneyBillWave, FaUserShield } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import type { AugmentedYieldBalanceWithAccountId } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import type { NormalizedYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldStatsProps = {
  yieldItem: AugmentedYieldDto
  balances?: NormalizedYieldBalances
}

export const YieldStats = ({ yieldItem, balances }: YieldStatsProps) => {
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const rewardBreakdownBg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const dividerColor = useColorModeValue('gray.200', 'whiteAlpha.100')

  const [searchParams] = useSearchParams()
  const validatorParam = searchParams.get('validator')

  const shouldFetchValidators =
    yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection
  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  const defaultValidator = useMemo(() => {
    if (yieldItem.chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]) {
      return DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]
    }
    return validators?.[0]?.address
  }, [yieldItem.chainId, validators])

  const selectedValidatorAddress = validatorParam || defaultValidator

  const tvlUsd = bnOrZero(yieldItem.statistics?.tvlUsd)
  const tvlUserCurrency = useMemo(
    () => tvlUsd.times(userCurrencyToUsdRate).toFixed(),
    [tvlUsd, userCurrencyToUsdRate],
  )
  const tvl = bnOrZero(yieldItem.statistics?.tvl).toNumber()

  const selectedValidator = useMemo(() => {
    if (!selectedValidatorAddress) return undefined

    // 1. Try active validators list
    const inList = validators?.find(v => v.address === selectedValidatorAddress)
    if (inList) return inList

    // 2. Try balances metadata
    const inBalances = balances?.raw.find(
      (b: AugmentedYieldBalanceWithAccountId) => b.validator?.address === selectedValidatorAddress,
    )?.validator
    if (inBalances) return inBalances

    return undefined
  }, [validators, selectedValidatorAddress, balances])

  const apy = bnOrZero(
    selectedValidator && 'rewardRate' in selectedValidator && selectedValidator.rewardRate
      ? selectedValidator.rewardRate.total
      : yieldItem.rewardRate.total,
  )
    .times(100)
    .toNumber()

  // Get validator data for staking yields
  const validatorMetadata = useMemo(() => {
    if (yieldItem.mechanics.type !== 'staking') return null
    if (selectedValidator)
      return { name: selectedValidator.name, logoURI: selectedValidator.logoURI }
    return null
  }, [yieldItem.mechanics.type, selectedValidator])

  return (
    <Card bg={cardBg} borderRadius='xl' shadow='sm' border='1px solid' borderColor={borderColor}>
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
          {/* APY Section */}
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
                  {apy.toFixed(2)}%
                  <Text as='span' fontSize='sm' fontWeight='normal' ml={1} color='text.subtle'>
                    {yieldItem.rewardRate.rateType}
                  </Text>
                </StatNumber>
              </Stat>
            </Tooltip>

            {/* Reward Breakdown */}
            {yieldItem.rewardRate.components.length > 0 && (
              <Flex
                direction='column'
                gap={2}
                mt={3}
                p={3}
                bg={rewardBreakdownBg}
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
            )}
          </Box>

          <Divider borderColor={dividerColor} />

          {/* TVL Section */}
          <Stat>
            <StatLabel fontSize='xs' color='text.subtle' mb={1}>
              {translate('yieldXYZ.tvl')}
            </StatLabel>
            <StatNumber fontSize='xl' fontWeight='bold'>
              <Amount.Fiat value={tvlUserCurrency} abbreviated />
            </StatNumber>
            <Text fontSize='xs' color='text.subtle' mt={1}>
              <Amount.Crypto value={tvl.toFixed()} symbol={yieldItem.token.symbol} abbreviated />
            </Text>
          </Stat>

          {/* Mechanics Grid */}
          <Box pt={2}>
            <Flex direction='column' gap={4}>
              <Flex justifyContent='space-between' alignItems='center'>
                <Flex alignItems='center' gap={2} color='text.subtle'>
                  <Icon as={FaLayerGroup} />
                  <Text fontSize='sm'>{translate('yieldXYZ.type')}</Text>
                </Flex>
                <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                  {yieldItem.mechanics.type}
                </Text>
              </Flex>
              {/* Validator Row (only for staking) */}
              {validatorMetadata && (
                <Flex justifyContent='space-between' alignItems='center'>
                  <Flex alignItems='center' gap={2} color='text.subtle'>
                    <Icon as={FaUserShield} />
                    <Text fontSize='sm'>Validator</Text>
                  </Flex>
                  <Flex alignItems='center' gap={2}>
                    {validatorMetadata.logoURI && (
                      <Avatar
                        size='xs'
                        src={validatorMetadata.logoURI}
                        name={validatorMetadata.name}
                      />
                    )}
                    <Text fontSize='sm' fontWeight='medium'>
                      {validatorMetadata.name}
                    </Text>
                  </Flex>
                </Flex>
              )}
              <Flex justifyContent='space-between' alignItems='center'>
                <Flex alignItems='center' gap={2} color='text.subtle'>
                  <Icon as={FaClock} />
                  <Text fontSize='sm'>{translate('yieldXYZ.rewardSchedule')}</Text>
                </Flex>
                <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                  {yieldItem.mechanics.rewardSchedule}
                </Text>
              </Flex>
              <Flex justifyContent='space-between' alignItems='center'>
                <Flex alignItems='center' gap={2} color='text.subtle'>
                  <Icon as={FaGasPump} />
                  <Text fontSize='sm'>{translate('yieldXYZ.gasToken')}</Text>
                </Flex>
                <Text fontSize='sm' fontWeight='medium'>
                  {yieldItem.mechanics.gasFeeToken.symbol}
                </Text>
              </Flex>
              {yieldItem.mechanics.entryLimits.minimum && (
                <Flex justifyContent='space-between' alignItems='center'>
                  <Flex alignItems='center' gap={2} color='text.subtle'>
                    <Icon as={FaMoneyBillWave} />
                    <Text fontSize='sm'>{translate('yieldXYZ.minDeposit')}</Text>
                  </Flex>
                  <Amount.Crypto
                    value={yieldItem.mechanics.entryLimits.minimum}
                    symbol={yieldItem.token.symbol}
                    fontSize='sm'
                    fontWeight='medium'
                  />
                </Flex>
              )}
            </Flex>
          </Box>
        </Flex>
      </CardBody>
    </Card>
  )
}
