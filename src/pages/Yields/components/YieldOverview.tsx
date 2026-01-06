import { Box, Card, CardBody, Flex, Stat, StatLabel, StatNumber, Text } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatLargeNumber } from '@/lib/utils/formatters'
import type { AugmentedYieldBalance, AugmentedYieldDto } from '@/lib/yieldxyz/types'

type YieldOverviewProps = {
  positions: AugmentedYieldDto[]
  balances: { [yieldId: string]: AugmentedYieldBalance[] } | undefined
}

export const YieldOverview = ({ positions, balances }: YieldOverviewProps) => {
  const translate = useTranslate()

  const { totalValueUsd, weightedApy } = positions.reduce(
    (acc, position) => {
      const positionBalances = balances?.[position.id]
      if (!positionBalances) return acc

      // Calculate total USD value for this position across all balance types
      const positionUsd = positionBalances.reduce(
        (sum, b) => sum.plus(bnOrZero(b.amountUsd)),
        bnOrZero(0),
      )

      if (positionUsd.eq(0)) return acc

      const apy = bnOrZero(position.rewardRate.total).times(100)

      return {
        totalValueUsd: acc.totalValueUsd.plus(positionUsd),
        weightedApy: acc.weightedApy.plus(apy.times(positionUsd)),
      }
    },
    { totalValueUsd: bnOrZero(0), weightedApy: bnOrZero(0) },
  )

  const finalApy = totalValueUsd.gt(0) ? weightedApy.div(totalValueUsd).toNumber() : 0

  if (positions.length === 0) return null

  return (
    <Card
      bgGradient='linear(to-r, blue.900, purple.900)'
      borderRadius='2xl'
      border='1px solid'
      borderColor='whiteAlpha.200'
      mb={8}
      overflow='hidden'
      position='relative'
    >
      {/* Abstract Background Element */}
      <Box
        position='absolute'
        top='-50%'
        right='-10%'
        w='400px'
        h='400px'
        bgGradient='radial(circle, blue.500 0%, transparent 70%)'
        opacity={0.1}
        filter='blur(60px)'
      />

      <CardBody p={{ base: 6, md: 8 }} position='relative' zIndex={1}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ base: 'flex-start', md: 'center' }}
          gap={6}
        >
          <Box>
            <Text color='blue.200' fontSize='sm' fontWeight='medium' mb={1}>
              {translate('yieldXYZ.yourDeposits')}
            </Text>
            <Text fontSize='4xl' fontWeight='800' color='white' lineHeight='1'>
              {formatLargeNumber(totalValueUsd.toNumber(), '$')}
            </Text>
          </Box>

          <Flex gap={12}>
            <Stat>
              <StatLabel color='blue.200' fontSize='sm' mb={1}>
                {translate('yieldXYZ.netApy')}
              </StatLabel>
              <StatNumber fontSize='2xl' fontWeight='bold' color='white'>
                {finalApy.toFixed(2)}%
              </StatNumber>
            </Stat>

            <Stat>
              <StatLabel color='blue.200' fontSize='sm' mb={1}>
                {translate('yieldXYZ.positions')}
              </StatLabel>
              <StatNumber fontSize='2xl' fontWeight='bold' color='white'>
                {positions.length}
              </StatNumber>
            </Stat>
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  )
}
