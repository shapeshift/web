import { Box, Skeleton, Stack } from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { BalanceChart } from 'components/BalanceChart/BalanceChart'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { Text } from 'components/Text'

import { AccountList } from './components/AccountList/AccountList'
import { usePortfolio } from './contexts/PortfolioContext'

export const Portfolio = () => {
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.DAY)
  const { totalBalance, loading: portfolioLoading } = usePortfolio()

  const loading = portfolioLoading
  const isLoaded = !loading

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
        <BalanceChart height={'350px'} timeframe={timeframe} />
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
