import { Box, Skeleton, Stack, Stat, StatArrow, StatNumber } from '@chakra-ui/react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { Text } from 'components/Text'
import { DEFAULT_HISTORY_TIMEFRAME } from 'context/AppProvider/AppContext'
import {
  selectPortfolioAssetIds,
  selectPortfolioLoading,
  selectPortfolioTotalFiatBalanceWithDelegations,
} from 'state/slices/selectors'

import { AccountTable } from './components/AccountList/AccountTable'

export const Portfolio = () => {
  const [timeframe, setTimeframe] = useState(DEFAULT_HISTORY_TIMEFRAME)
  const [percentChange, setPercentChange] = useState(0)

  const assetIds = useSelector(selectPortfolioAssetIds)
  const totalBalance = useSelector(selectPortfolioTotalFiatBalanceWithDelegations)

  const loading = useSelector(selectPortfolioLoading)
  const isLoaded = !loading

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
          <Box mb={{ base: 6, md: 0 }}>
            <Card.Heading as='div' color='gray.500'>
              <Skeleton isLoaded={isLoaded}>
                <Text translation='dashboard.portfolio.portfolioBalance' />
              </Skeleton>
            </Card.Heading>

            <Card.Heading as='h2' fontSize='4xl' lineHeight='1' mt={2}>
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
          </Box>
          <Skeleton isLoaded={isLoaded}>
            <TimeControls defaultTime={timeframe} onChange={time => setTimeframe(time)} />
          </Skeleton>
        </Card.Header>
        <BalanceChart
          assetIds={assetIds}
          timeframe={timeframe}
          percentChange={percentChange}
          setPercentChange={setPercentChange}
        />
      </Card>
      <Card>
        <Card.Header>
          <Card.Heading>
            <Text translation='dashboard.portfolio.yourAssets' />
          </Card.Heading>
        </Card.Header>
        <Card.Body px={2} pt={0}>
          <AccountTable />
        </Card.Body>
      </Card>
    </Stack>
  )
}
