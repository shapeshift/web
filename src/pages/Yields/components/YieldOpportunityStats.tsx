import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { memo } from 'react'
import { FaChartPie, FaInfoCircle, FaMoon } from 'react-icons/fa'
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
  isAvailableToEarnTab?: boolean
  onNavigateToAvailableTab?: () => void
  onNavigateToAllTab?: () => void
  isConnected: boolean
  isMobile?: boolean
}

export const YieldOpportunityStats = memo(function YieldOpportunityStats({
  positions,
  balances,
  allYields,
  isAvailableToEarnTab,
  onNavigateToAvailableTab,
  onNavigateToAllTab,
  isConnected,
  isMobile,
}: YieldOpportunityStatsProps) {
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const portfolioBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const { data: yields } = useYields()

  const activeValueUsd = positions.reduce((acc, position) => {
    const positionBalances = balances?.[position.id]
    if (!positionBalances) return acc
    const activeBalances = positionBalances.filter(b => b.type === 'active' || b.type === 'locked')
    return activeBalances.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), acc)
  }, bnOrZero(0))

  const idleValueUsd = (() => {
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
  })()

  const { weightedApy, potentialEarningsValue } = (() => {
    if (!isConnected || !yields?.byInputAssetId || !portfolioBalances) {
      return { weightedApy: 0, potentialEarningsValue: bnOrZero(0) }
    }

    let totalEarnings = bnOrZero(0)
    let totalActionableBalance = bnOrZero(0)

    for (const [assetId, balanceFiat] of Object.entries(portfolioBalances)) {
      const yieldsForAsset = yields.byInputAssetId[assetId]
      if (!yieldsForAsset?.length) continue

      const balance = bnOrZero(balanceFiat)
      const bestApy = Math.max(...yieldsForAsset.map(y => y.rewardRate.total))

      totalEarnings = totalEarnings.plus(balance.times(bestApy))
      totalActionableBalance = totalActionableBalance.plus(balance)
    }

    const avgApy = totalActionableBalance.gt(0)
      ? totalEarnings.div(totalActionableBalance).times(100).toNumber()
      : 0

    return { weightedApy: avgApy, potentialEarningsValue: totalEarnings }
  })()

  const hasActiveDeposits = activeValueUsd.gt(0)
  const activeValueFormatted = activeValueUsd.times(userCurrencyToUsdRate).toFixed()
  const idleValueFormatted = idleValueUsd.toFixed()
  const potentialEarnings = potentialEarningsValue.toFixed()
  const weightedApyFormatted = weightedApy.toFixed(2)
  const positionsCount = positions.length
  const gridColumn = { md: hasActiveDeposits ? 'span 2' : 'span 3' }
  const buttonBg = isAvailableToEarnTab ? 'whiteAlpha.300' : 'blue.500'
  const buttonHoverBg = { bg: isAvailableToEarnTab ? 'whiteAlpha.400' : 'blue.400' }
  const buttonText = isAvailableToEarnTab
    ? translate('yieldXYZ.showAll')
    : translate('yieldXYZ.earn')

  const toggleButtonClickHandler = isAvailableToEarnTab
    ? onNavigateToAllTab
    : onNavigateToAvailableTab

  if (isMobile) return null

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
      {hasActiveDeposits && (
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
      )}
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
              <HStack spacing={1}>
                <Text>{translate('yieldXYZ.availableToEarn')}</Text>
                <Tooltip label={translate('yieldXYZ.availableToEarnTooltip')} hasArrow>
                  <Box as='span' cursor='help'>
                    <Icon as={FaInfoCircle} boxSize={3} color='purple.300' />
                  </Box>
                </Tooltip>
              </HStack>
            </StatLabel>
            <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
              <Amount.Fiat value={idleValueFormatted} abbreviated />
            </StatNumber>
            <StatHelpText color='purple.300'>
              <HStack spacing={1}>
                <Text>
                  {translate('yieldXYZ.idleAssetsEarning', { apy: weightedApyFormatted })}
                </Text>
                <Tooltip label={translate('yieldXYZ.apyTooltip')} hasArrow>
                  <Box as='span' cursor='help'>
                    <Icon as={FaInfoCircle} boxSize={3} color='purple.400' />
                  </Box>
                </Tooltip>
              </HStack>
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
              <HStack spacing={1} justify='flex-end'>
                <Text
                  fontSize='xs'
                  fontWeight='bold'
                  color='purple.100'
                  textTransform='uppercase'
                  letterSpacing='wider'
                >
                  {translate('yieldXYZ.potentialEarnings')}
                </Text>
                <Tooltip label={translate('yieldXYZ.potentialEarningsTooltip')} hasArrow>
                  <Box as='span' cursor='help'>
                    <Icon as={FaInfoCircle} boxSize={3} color='purple.200' />
                  </Box>
                </Tooltip>
              </HStack>
              <Flex fontSize='xl' fontWeight='bold' color='white' whiteSpace='nowrap'>
                <Amount.Fiat value={potentialEarnings} abbreviated />
                <Text ml={1}>{translate('yieldXYZ.perYear')}</Text>
              </Flex>
            </Box>
            {toggleButtonClickHandler && (
              <Button
                size='sm'
                bg={buttonBg}
                color='white'
                _hover={buttonHoverBg}
                onClick={toggleButtonClickHandler}
                width='full'
              >
                {buttonText}
              </Button>
            )}
          </Flex>
        </Flex>
      </Box>
    </SimpleGrid>
  )
})
