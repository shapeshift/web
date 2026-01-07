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
import { useMemo } from 'react'
import { FaChartPie, FaLeaf } from 'react-icons/fa'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto, YieldBalancesResponse } from '@/lib/yieldxyz/types'
import { selectPortfolioUserCurrencyBalances } from '@/state/slices/common-selectors'
import { useAppSelector } from '@/state/store'

type YieldOpportunityStatsProps = {
  positions: AugmentedYieldDto[]
  balances: Record<string, YieldBalancesResponse['balances']> | undefined
  allYields: AugmentedYieldDto[] | undefined
  isMyOpportunities?: boolean
  onToggleMyOpportunities?: () => void
}

export const YieldOpportunityStats = ({
  positions,
  balances,
  allYields,
  isMyOpportunities,
  onToggleMyOpportunities,
}: YieldOpportunityStatsProps) => {
  // 1. Calculate Active Yield Value
  const activeValueUsd = useMemo(() => {
    return positions.reduce((acc, position) => {
      const positionBalances = balances?.[position.id]
      if (!positionBalances) return acc

      const activeBalance = positionBalances.find(b => b.type === 'active' || b.type === 'locked')
      return acc.plus(bnOrZero(activeBalance?.amountUsd))
    }, bnOrZero(0))
  }, [positions, balances])

  // 2. Calculate "Idle Assets" (Opportunity)
  // Sum of wallet balances for assets that support yield (input tokens of allYields)
  const portfolioBalances = useAppSelector(selectPortfolioUserCurrencyBalances)

  const idleValueUsd = useMemo(() => {
    if (!allYields) return bnOrZero(0)

    // Get unique asset IDs that have yield opportunities
    const yieldableAssetIds = new Set<string>()
    allYields.forEach(y => {
      // Check inputTokens first
      y.inputTokens?.forEach(t => {
        if (t.assetId) yieldableAssetIds.add(t.assetId)
      })

      // Fallback or additional check: some yields might be single-sided staking where input=token
      if (y.token.assetId) yieldableAssetIds.add(y.token.assetId)
    })

    // Now sum user balances for these assets
    let totalIdle = bnOrZero(0)
    yieldableAssetIds.forEach(assetId => {
      const bal = portfolioBalances[assetId]
      if (bal) {
        totalIdle = totalIdle.plus(bnOrZero(bal)) // UserCurrencyBalance is USD string
      }
    })

    return totalIdle
  }, [allYields, portfolioBalances])

  // Opportunity APY (Average APY of available yields weighted by ... or just max APY?)
  // For simplicity, let's show "Up to X% APY"
  const maxApy = useMemo(() => {
    if (!allYields) return 0
    return Math.max(...allYields.map(y => y.rewardRate.total)) * 100
  }, [allYields])

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
      {/* Active Position Card */}
      <Box
        bgGradient='linear(to-br, blue.800, blue.900)'
        p={6}
        borderRadius='2xl'
        boxShadow='xl'
        border='1px solid'
        borderColor='blue.700'
        position='relative'
        overflow='hidden'
      >
        <Box position='absolute' right={-4} top={-4} opacity={0.1}>
          <Icon as={FaChartPie} boxSize={32} />
        </Box>
        <Stat>
          <StatLabel fontSize='md' color='blue.200'>
            Active Deposits
          </StatLabel>
          <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
            <Amount.Fiat value={activeValueUsd.toFixed()} abbreviated />
          </StatNumber>
          <StatHelpText color='blue.300'>Across {positions.length} positions</StatHelpText>
        </Stat>
      </Box>

      {/* Available to Earn (Carrot) Card */}
      <Box
        bgGradient='linear(to-br, purple.800, purple.900)'
        p={6}
        borderRadius='2xl'
        boxShadow='xl'
        border='1px solid'
        borderColor='purple.700'
        position='relative'
        overflow='hidden'
        gridColumn={{ md: 'span 2' }}
      >
        <Box position='absolute' right={-4} top={-4} opacity={0.1}>
          <Icon as={FaLeaf} boxSize={32} />
        </Box>
        <Flex justifyContent='space-between' alignItems='center'>
          <Stat>
            <StatLabel fontSize='md' color='purple.200'>
              Available to Earn
            </StatLabel>
            <StatNumber fontSize='3xl' fontWeight='bold' color='white'>
              <Amount.Fiat value={idleValueUsd.toFixed()} abbreviated />
            </StatNumber>
            <StatHelpText color='purple.300'>
              Idle assets that could be earning up to {maxApy.toFixed(2)}% APY
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
              <Text fontSize='xl' fontWeight='bold' color='white'>
                <Amount.Fiat value={idleValueUsd.times(0.05).toFixed()} abbreviated /> / yr
              </Text>
            </Box>
            {onToggleMyOpportunities && (
              <Button
                size='sm'
                bg={isMyOpportunities ? 'whiteAlpha.300' : 'blue.500'}
                color={isMyOpportunities ? 'white' : 'white'}
                _hover={{ bg: isMyOpportunities ? 'whiteAlpha.400' : 'blue.400' }}
                onClick={onToggleMyOpportunities}
                width='full'
              >
                {isMyOpportunities ? 'Show All' : 'Earn'}
              </Button>
            )}
          </Flex>
        </Flex>
      </Box>
    </SimpleGrid>
  )
}
