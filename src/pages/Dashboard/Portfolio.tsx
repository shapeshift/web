import {
  Button,
  Flex,
  Skeleton,
  Stack,
  Stat,
  StatArrow,
  StatNumber,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@chakra-ui/react'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { MaybeChartUnavailable } from 'components/MaybeChartUnavailable'
import { NftTable } from 'components/Nfts/NftTable'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { EligibleCarousel } from 'pages/Defi/components/EligibleCarousel'
import {
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
  const [timeframe, setTimeframe] = useState<HistoryTimeframe>(DEFAULT_HISTORY_TIMEFRAME)
  const [percentChange, setPercentChange] = useState(0)
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const translate = useTranslate()

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
            <TimeControls defaultTime={timeframe} onChange={time => setTimeframe(time)} />
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
            onChange={setTimeframe}
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
        <Tabs isLazy variant='unstyled'>
          <Card.Header px={2}>
            <TabList>
              <Tab
                color='gray.500'
                _selected={{ color: 'chakra-body-text' }}
                _hover={{ color: 'chakra-body-text' }}
              >
                <Card.Heading>
                  <Text translation='dashboard.portfolio.yourAssets' />
                </Card.Heading>
              </Tab>
              {isNftsEnabled && (
                <Tab
                  color='gray.500'
                  _selected={{ color: 'chakra-body-text' }}
                  _hover={{ color: 'chakra-body-text' }}
                >
                  <Card.Heading display='flex' gap={2} alignItems='center'>
                    <RawText>NFTs</RawText>
                    <Tag
                      colorScheme='pink'
                      size='sm'
                      fontSize='xs'
                      fontWeight='bold'
                      lineHeight={1}
                    >
                      {translate('common.new')}
                    </Tag>
                  </Card.Heading>
                </Tab>
              )}
            </TabList>
          </Card.Header>
          <TabPanels>
            <TabPanel px={2} pt={0}>
              <AccountTable />
            </TabPanel>
            {isNftsEnabled && (
              <TabPanel px={6} pt={0}>
                <NftTable />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Card>
    </Stack>
  )
}
