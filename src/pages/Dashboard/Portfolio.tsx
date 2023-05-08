import {
  Button,
  Flex,
  Skeleton,
  Stack,
  Stat,
  StatArrow,
  StatNumber,
  Switch,
} from '@chakra-ui/react'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { Text } from 'components/Text'
import { useTimeframeChange } from 'hooks/useTimeframeChange/useTimeframeChange'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import {
  selectChartTimeframe,
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioAssetIds,
  selectPortfolioLoading,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountTable } from './components/AccountList/AccountTable'
import { PortfolioBreakdown } from './PortfolioBreakdown'

export const Portfolio = () => {
  const userChartTimeframe = useAppSelector(selectChartTimeframe)
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>(userChartTimeframe)
  const handleTimeframeChange = useTimeframeChange(setTimeframe)

  const [percentChange, setPercentChange] = useState(0)

  const assetIds = useAppSelector(selectPortfolioAssetIds)

  const earnFiatBalance = useAppSelector(selectEarnBalancesFiatAmountFull).toFixed()
  const portfolioTotalFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const claimableRewardsFiatBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsFiatBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsFiatBalanceFilter),
  )
  const totalBalance = useMemo(
    () =>
      bnOrZero(earnFiatBalance)
        .plus(portfolioTotalFiatBalance)
        .plus(claimableRewardsFiatBalance)
        .toFixed(),
    [claimableRewardsFiatBalance, earnFiatBalance, portfolioTotalFiatBalance],
  )

  const loading = useAppSelector(selectPortfolioLoading)
  const isLoaded = !loading

  const [isRainbowChart, setIsRainbowChart] = useState(false)
  const toggleChartType = useCallback(() => setIsRainbowChart(!isRainbowChart), [isRainbowChart])

  return (
    <Stack spacing={6} width='full'>
      <Card variant='footer-stub'>
        <Card.Header
          display='flex'
          justifyContent={{ base: 'center', md: 'space-between' }}
          alignItems='center'
          textAlign={{ base: 'center', md: 'inherit' }}
          width='full'
          flexDir={{ base: 'column', md: 'row' }}
        >
          <Button size='sm' flexDirection='row' onClick={toggleChartType} variant='outline'>
            <Text translation='dashboard.portfolio.totalChart' />
            <Switch isChecked={isRainbowChart} pointerEvents='none' mx={2} size='sm' />
            <Text translation='dashboard.portfolio.rainbowChart' />
          </Button>
          <Skeleton isLoaded={isLoaded} display={{ base: 'none', md: 'block' }}>
            <TimeControls defaultTime={timeframe} onChange={handleTimeframeChange} />
          </Skeleton>
        </Card.Header>
        <Flex flexDir='column' justifyContent='center' alignItems='center'>
          <Card.Heading as='div' color='gray.500'>
            <Skeleton isLoaded={isLoaded}>
              <Text translation='defi.netWorth' />
            </Skeleton>
          </Card.Heading>
          <Card.Heading as='h2' fontSize='4xl' lineHeight='1'>
            <Skeleton isLoaded={isLoaded}>
              <Amount.Fiat value={totalBalance} />
            </Skeleton>
          </Card.Heading>
          {isFinite(percentChange) && (
            <Skeleton mt={2} isLoaded={!!percentChange}>
              <Stat display='flex' justifyContent={{ base: 'center', md: 'flex-start' }}>
                <StatNumber fontSize='md' display='flex' alignItems='center'>
                  <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
                  <Amount.Percent value={percentChange * 0.01} />
                </StatNumber>
              </Stat>
            </Skeleton>
          )}
        </Flex>
        <BalanceChart
          timeframe={timeframe}
          percentChange={percentChange}
          setPercentChange={setPercentChange}
          isRainbowChart={isRainbowChart}
        />
        <Skeleton isLoaded={isLoaded} display={{ base: 'block', md: 'none' }}>
          <TimeControls
            onChange={handleTimeframeChange}
            defaultTime={timeframe}
            buttonGroupProps={{
              display: 'flex',
              width: 'full',
              justifyContent: 'space-between',
              px: 6,
              py: 4,
            }}
          />
        </Skeleton>
      </Card>
      <MaybeChartUnavailable assetIds={assetIds} />
      <PortfolioBreakdown />
      <EligibleCarousel display={{ base: 'flex', md: 'none' }} />
      <Card>
        <Card.Header>
          <Card.Heading>
            <Text translation='dashboard.portfolio.yourAssets' />
          </Card.Heading>
        </Card.Header>
        <Card.Body px={{ base: 2, md: 2 }} pt={0} pb={0}>
          <AccountTable />
        </Card.Body>
      </Card>
    </Stack>
  )
}
