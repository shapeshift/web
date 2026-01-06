import {
  Box,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { YieldDto } from '@/lib/yieldxyz/types'

interface YieldStatsProps {
  yieldItem: YieldDto
}

export const YieldStats = ({ yieldItem }: YieldStatsProps) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const tvlUsd = bnOrZero(yieldItem.statistics?.tvlUsd).toNumber()
  const tvl = bnOrZero(yieldItem.statistics?.tvl).toNumber()
  const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toNumber()

  const formatTvl = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

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
              {formatTvl(tvlUsd)}
            </StatNumber>
            <Text fontSize='xs' color='text.subtle' mt={1}>
              {tvl.toLocaleString(undefined, { maximumFractionDigits: 4 })} {yieldItem.token.symbol}
            </Text>
          </Stat>

          {/* Mechanics Grid */}
          <Box pt={2}>
            <Text
              fontSize='xs'
              color='text.subtle'
              mb={3}
              fontWeight='bold'
              textTransform='uppercase'
              letterSpacing='wide'
            >
              {translate('yieldXYZ.mechanics')}
            </Text>
            <Flex direction='column' gap={3}>
              <Flex justifyContent='space-between'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('yieldXYZ.type')}
                </Text>
                <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                  {yieldItem.mechanics.type}
                </Text>
              </Flex>
              <Flex justifyContent='space-between'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('yieldXYZ.rewardSchedule')}
                </Text>
                <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                  {yieldItem.mechanics.rewardSchedule}
                </Text>
              </Flex>
              <Flex justifyContent='space-between'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('yieldXYZ.gasToken')}
                </Text>
                <Text fontSize='sm' fontWeight='medium'>
                  {yieldItem.mechanics.gasFeeToken.symbol}
                </Text>
              </Flex>
              {yieldItem.mechanics.entryLimits.minimum && (
                <Flex justifyContent='space-between'>
                  <Text fontSize='sm' color='text.subtle'>
                    {translate('yieldXYZ.minDeposit')}
                  </Text>
                  <Text fontSize='sm' fontWeight='medium'>
                    {bnOrZero(yieldItem.mechanics.entryLimits.minimum).toNumber()}{' '}
                    {yieldItem.token.symbol}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Box>
        </Flex>
      </CardBody>
    </Card>
  )
}
