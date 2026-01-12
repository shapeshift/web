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
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto, YieldBalancesResponse } from '@/lib/yieldxyz/types'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
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
  isConnected: boolean
}

export const YieldOpportunityStats = memo(function YieldOpportunityStats({
  positions,
  balances,
  allYields,
  isMyOpportunities,
  onToggleMyOpportunities,
  isConnected,
}: YieldOpportunityStatsProps) {
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const portfolioBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const { data: yields } = useYields()

  const activeValueUsd = useMemo(() => {
    return positions.reduce((acc, position) => {
      const positionBalances = balances?.[position.id]
      if (!positionBalances) return acc
      const activeBalance = positionBalances.find(b => b.type === 'active' || b.type === 'locked')
      return acc.plus(bnOrZero(activeBalance?.amountUsd))
    }, bnOrZero(0))
  }, [positions, balances])

  const idleValueUsd = useMemo(() => {
    if (!isConnected || !allYields) return bnOrZero(0)

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
  }, [isConnected, allYields, portfolioBalances])

  // Calculate weighted APY and potential earnings based on user's actual held assets
  const { weightedApy, potentialEarningsValue } = useMemo(() => {
    if (!isConnected || !yields?.byInputAssetId || !portfolioBalances) {
      return { weightedApy: 0, potentialEarningsValue: bnOrZero(0) }
    }

    let totalEarnings = bnOrZero(0)
    let totalActionableBalance = bnOrZero(0)

    for (const [assetId, balanceFiat] of Object.entries(portfolioBalances)) {
      const yieldsForAsset = yields.byInputAssetId[assetId]
      if (!yieldsForAsset?.length) continue // Early bail - no yield for this asset

      const balance = bnOrZero(balanceFiat)
      const bestApy = Math.max(...yieldsForAsset.map(y => y.rewardRate.total))

      totalEarnings = totalEarnings.plus(balance.times(bestApy))
      totalActionableBalance = totalActionableBalance.plus(balance)
    }

    const avgApy = totalActionableBalance.gt(0)
      ? totalEarnings.div(totalActionableBalance).times(100).toNumber()
      : 0

    return { weightedApy: avgApy, potentialEarningsValue: totalEarnings }
  }, [isConnected, yields?.byInputAssetId, portfolioBalances])

  const hasActiveDeposits = useMemo(() => activeValueUsd.gt(0), [activeValueUsd])

  const activeValueFormatted = useMemo(
    () => activeValueUsd.times(userCurrencyToUsdRate).toFixed(),
    [activeValueUsd, userCurrencyToUsdRate],
  )

  const idleValueFormatted = useMemo(() => idleValueUsd.toFixed(), [idleValueUsd])

  const potentialEarnings = useMemo(
    () => potentialEarningsValue.toFixed(),
    [potentialEarningsValue],
  )

  const weightedApyFormatted = useMemo(() => weightedApy.toFixed(2), [weightedApy])

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

  const buttonText = useMemo(
    () => (isMyOpportunities ? translate('yieldXYZ.showAll') : translate('yieldXYZ.earn')),
    [isMyOpportunities, translate],
  )

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
            {translate('yieldXYZ.activePositions')}
          </StatLabel>
          <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
            <Amount.Fiat value={activeValueFormatted} abbreviated />
          </StatNumber>
          <StatHelpText color='blue.300'>
            {translate('yieldXYZ.acrossPositions', { count: positionsCount })}
          </StatHelpText>
        </Stat>
      </Box>
    )
  }, [hasActiveDeposits, activeValueFormatted, positionsCount, translate])

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
              {translate('yieldXYZ.availableToEarn')}
            </StatLabel>
            <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
              <Amount.Fiat value={idleValueFormatted} abbreviated />
            </StatNumber>
            <StatHelpText color='purple.300'>
              {translate('yieldXYZ.idleAssetsEarning', { apy: weightedApyFormatted })}
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
                {translate('yieldXYZ.potentialEarnings')}
              </Text>
              <Flex fontSize='xl' fontWeight='bold' color='white' whiteSpace='nowrap'>
                <Amount.Fiat value={potentialEarnings} abbreviated />
                <Text ml={1}>{translate('yieldXYZ.perYear')}</Text>
              </Flex>
            </Box>
            {toggleButton}
          </Flex>
        </Flex>
      </Box>
    </SimpleGrid>
  )
})
