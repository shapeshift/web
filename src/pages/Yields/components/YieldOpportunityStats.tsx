import {
  Box,
  Button,
  Flex,
  Icon,
  SimpleGrid,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { FaChartPie, FaMoon } from 'react-icons/fa'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto, YieldBalancesResponse } from '@/lib/yieldxyz/types'
import { selectPortfolioUserCurrencyBalances } from '@/state/slices/common-selectors'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const chartPieIcon = <Icon as={FaChartPie} boxSize={32} />
const moonIcon = <Icon as={FaMoon} boxSize={32} />

type YieldOpportunityStatsProps = {
  positions: AugmentedYieldDto[]
  balances: Record<string, YieldBalancesResponse['balances']> | undefined
  allYields: AugmentedYieldDto[] | undefined
  isMyOpportunities?: boolean
  onToggleMyOpportunities?: () => void
}

export const YieldOpportunityStats = memo(function YieldOpportunityStats({
  positions,
  balances,
  allYields,
  isMyOpportunities,
  onToggleMyOpportunities,
}: YieldOpportunityStatsProps) {
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const portfolioBalances = useAppSelector(selectPortfolioUserCurrencyBalances)

  const activeValueUsd = useMemo(() => {
    return positions.reduce((acc, position) => {
      const positionBalances = balances?.[position.id]
      if (!positionBalances) return acc
      const activeBalance = positionBalances.find(b => b.type === 'active' || b.type === 'locked')
      return acc.plus(bnOrZero(activeBalance?.amountUsd))
    }, bnOrZero(0))
  }, [positions, balances])

  const idleValueUsd = useMemo(() => {
    if (!allYields) return bnOrZero(0)

    const yieldableAssetIds = new Set(
      allYields.flatMap(
        y =>
          [...(y.inputTokens?.map(t => t.assetId).filter(Boolean) ?? []), y.token.assetId].filter(
            Boolean,
          ) as string[],
      ),
    )

    return [...yieldableAssetIds].reduce((totalIdle, assetId) => {
      const bal = portfolioBalances[assetId]
      return bal ? totalIdle.plus(bnOrZero(bal)) : totalIdle
    }, bnOrZero(0))
  }, [allYields, portfolioBalances])

  const maxApy = useMemo(() => {
    if (!allYields) return 0
    return Math.max(...allYields.map(y => y.rewardRate.total)) * 100
  }, [allYields])

  const hasActiveDeposits = useMemo(() => activeValueUsd.gt(0), [activeValueUsd])

  const activeValueFormatted = useMemo(
    () => activeValueUsd.times(userCurrencyToUsdRate).toFixed(),
    [activeValueUsd, userCurrencyToUsdRate],
  )

  const idleValueFormatted = useMemo(() => idleValueUsd.toFixed(), [idleValueUsd])

  const potentialEarnings = useMemo(() => idleValueUsd.times(0.05).toFixed(), [idleValueUsd])

  const maxApyFormatted = useMemo(() => maxApy.toFixed(2), [maxApy])

  const positionsCount = useMemo(() => positions.length, [positions.length])

  const gridColumn = useMemo(
    () => ({ md: hasActiveDeposits ? 'span 2' : 'span 3' }),
    [hasActiveDeposits],
  )

  const buttonBg = useMemo(
    () => (isMyOpportunities ? 'whiteAlpha.300' : 'blue.500'),
    [isMyOpportunities],
  )

  const buttonHoverBg = useMemo(
    () => ({ bg: isMyOpportunities ? 'whiteAlpha.400' : 'blue.400' }),
    [isMyOpportunities],
  )

  const buttonText = useMemo(() => (isMyOpportunities ? 'Show All' : 'Earn'), [isMyOpportunities])

  const activeDepositsCard = useMemo(() => {
    if (!hasActiveDeposits) return null
    return (
      <Box
        bgGradient='linear(to-br, blue.800, blue.900)'
        p={6}
        borderRadius='2xl'
        boxShadow='xl'
        border='1px solid'
        borderColor='blue.700'
        position='relative'
        overflow='hidden'
        display='flex'
        flexDirection='column'
        justifyContent='center'
      >
        <Box position='absolute' right={-4} top={-4} opacity={0.1}>
          {chartPieIcon}
        </Box>
        <Stat>
          <StatLabel fontSize='md' color='blue.200'>
            Active Deposits
          </StatLabel>
          <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
            <Amount.Fiat value={activeValueFormatted} abbreviated />
          </StatNumber>
          <StatHelpText color='blue.300'>Across {positionsCount} positions</StatHelpText>
        </Stat>
      </Box>
    )
  }, [hasActiveDeposits, activeValueFormatted, positionsCount])

  const toggleButton = useMemo(() => {
    if (!onToggleMyOpportunities) return null
    return (
      <Button
        size='sm'
        bg={buttonBg}
        color='white'
        _hover={buttonHoverBg}
        onClick={onToggleMyOpportunities}
        width='full'
      >
        {buttonText}
      </Button>
    )
  }, [onToggleMyOpportunities, buttonBg, buttonHoverBg, buttonText])

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
      {activeDepositsCard}
      <Box
        bgGradient='linear(to-br, purple.800, purple.900)'
        p={6}
        borderRadius='2xl'
        boxShadow='xl'
        border='1px solid'
        borderColor='purple.700'
        position='relative'
        overflow='hidden'
        gridColumn={gridColumn}
      >
        <Box position='absolute' right={-4} top={-4} opacity={0.1}>
          {moonIcon}
        </Box>
        <Flex justifyContent='space-between' alignItems='flex-start'>
          <Stat>
            <StatLabel fontSize='md' color='purple.200'>
              Available to Earn
            </StatLabel>
            <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
              <Amount.Fiat value={idleValueFormatted} abbreviated />
            </StatNumber>
            <StatHelpText color='purple.300'>
              Idle assets that could be earning up to {maxApyFormatted}% APY
            </StatHelpText>
          </Stat>
          <Flex
            bg='whiteAlpha.200'
            p={4}
            borderRadius='xl'
            backdropFilter='blur(10px)'
            border='1px solid'
            borderColor='whiteAlpha.100'
            direction='column'
            align='flex-end'
            gap={3}
            minW='200px'
          >
            <Box textAlign='right'>
              <Text
                fontSize='xs'
                fontWeight='bold'
                color='purple.100'
                textTransform='uppercase'
                letterSpacing='wider'
              >
                Potential Earnings
              </Text>
              <Flex fontSize='xl' fontWeight='bold' color='white' whiteSpace='nowrap'>
                <Amount.Fiat value={potentialEarnings} abbreviated />
                <Text ml={1}>/yr</Text>
              </Flex>
            </Box>
            {toggleButton}
          </Flex>
        </Flex>
      </Box>
    </SimpleGrid>
  )
})
