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
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react' // Added useMemo
import { FaClock, FaGasPump, FaLayerGroup, FaMoneyBillWave, FaUserShield } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom' // Added useSearchParams

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants' // Added constants
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldNetwork } from '@/lib/yieldxyz/types'
import { useYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { selectFirstAccountIdByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

interface YieldStatsProps {
  yieldItem: AugmentedYieldDto
}

export const YieldStats = ({ yieldItem }: YieldStatsProps) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

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

  const tvlUsd = bnOrZero(yieldItem.statistics?.tvlUsd).toNumber()
  const tvl = bnOrZero(yieldItem.statistics?.tvl).toNumber()

  const { chainId } = yieldItem
  const accountId = useAppSelector(state =>
    chainId ? selectFirstAccountIdByChainId(state, chainId) : undefined,
  )
  const address = accountId ? fromAccountId(accountId).account : undefined

  const { data: balances } = useYieldBalances({
    yieldId: yieldItem.id,
    address: address ?? '',
    chainId,
  })

  const selectedValidator = useMemo(() => {
    if (!selectedValidatorAddress) return undefined

    // 1. Try active validators list
    const inList = validators?.find(v => v.address === selectedValidatorAddress)
    if (inList) return inList

    // 2. Try balances metadata
    const inBalances = balances?.find(b => b.validator?.address === selectedValidatorAddress)
      ?.validator
    if (inBalances) return inBalances

    return undefined
  }, [validators, selectedValidatorAddress, balances])

  const apy = bnOrZero(selectedValidator?.rewardRate?.total ?? yieldItem.rewardRate.total)
    .times(100)
    .toNumber()

  // Get validator data for staking yields
  const validatorMetadata = (() => {
    if (yieldItem.mechanics.type !== 'staking') return null

    if (selectedValidator)
      return { name: selectedValidator.name, logoURI: selectedValidator.logoURI }

    // Fallback names if validator data not loaded yet or not found
    if (selectedValidatorAddress) {
      // Try to find known validators by address hardcoded if needed, or return generic
      const FIGMENT_COSMOS_VALIDATOR_ADDRESS =
        'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
      const FIGMENT_SOLANA_VALIDATOR_ADDRESS = 'CcaHc2L43ZWjwCHART3oZoJvHLAe9hzT2DJNUpBzoTN1'
      const FIGMENT_SUI_VALIDATOR_ADDRESS =
        '0x8ecaf4b95b3c82c712d3ddb22e7da88d2286c4653f3753a86b6f7a216a3ca518'

      if (
        selectedValidatorAddress === FIGMENT_COSMOS_VALIDATOR_ADDRESS ||
        selectedValidatorAddress === FIGMENT_SOLANA_VALIDATOR_ADDRESS ||
        selectedValidatorAddress === FIGMENT_SUI_VALIDATOR_ADDRESS
      ) {
        return { name: 'Figment', logoURI: '' }
      }
    }

    if (yieldItem.network === YieldNetwork.Monad) return { name: 'Figment', logoURI: '' }
    if (yieldItem.network === YieldNetwork.Tron) return { name: 'Justlend', logoURI: '' }

    return null
  })()

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
              <Flex direction='column' gap={2} mt={3} p={3} bg='whiteAlpha.50' borderRadius='md'>
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

          <Divider borderColor='whiteAlpha.100' />

          {/* TVL Section */}
          <Stat>
            <StatLabel fontSize='xs' color='text.subtle' mb={1}>
              {translate('yieldXYZ.tvl')}
            </StatLabel>
            <StatNumber fontSize='xl' fontWeight='bold'>
              <Amount.Fiat value={tvlUsd} abbreviated />
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
