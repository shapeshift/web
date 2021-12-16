import { Box, Skeleton, Stack } from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { Text } from 'components/Text'
import { useBalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'
import {
  selectPortfolioAssetIds,
  selectPortfolioLoading,
  selectPortfolioTotalFiatBalance
} from 'state/slices/portfolioSlice/portfolioSlice'

import { AccountList } from './components/AccountList/AccountList'

export const Portfolio = () => {
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.DAY)

  const assets = useSelector(selectPortfolioAssetIds)
  const totalBalance = useSelector(selectPortfolioTotalFiatBalance)
  const loading = useSelector(selectPortfolioLoading)
  const isLoaded = !loading

  const { balanceChartData, balanceChartDataLoading } = useBalanceChartData({
    assets,
    timeframe
  })

  return (
    <Stack spacing={6} width='full' pt={{ base: 0, lg: 4 }} pr={{ base: 0, lg: 4 }}>
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
          </Box>
          <Skeleton isLoaded={isLoaded}>
            <TimeControls defaultTime={timeframe} onChange={time => setTimeframe(time)} />
          </Skeleton>
        </Card.Header>
        <Card.Body p={0} height='350px'>
          <Graph data={balanceChartData} loading={balanceChartDataLoading} isLoaded={isLoaded} />
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>
          <Card.Heading>
            <Text translation='dashboard.portfolio.yourAssets' />
          </Card.Heading>
        </Card.Header>
        <Card.Body px={2} pt={0}>
          <AccountList />
        </Card.Body>
      </Card>
    </Stack>
  )
}
