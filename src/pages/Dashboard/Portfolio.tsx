import { Box, Grid, Spinner, Stack } from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useState } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { RawText, Text } from 'components/Text'

import { AccountList } from './components/AccountList/AccountList'
import { usePortfolio } from './contexts/PortfolioContext'

export const Portfolio = () => {
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.YEAR)
  const { totalBalance, loading, balances } = usePortfolio()

  balances && console.info(balances)

  if (loading)
    return (
      <Box d='flex' width='full' justifyContent='center' alignItems='center'>
        <Spinner />
      </Box>
    )

  return (
    <Stack spacing={6} width='full' p={{ base: 0, lg: 4 }}>
      <Card variant='footer-stub'>
        <Card.Header
          display='flex'
          justifyContent={{ base: 'center', md: 'space-between' }}
          alignItems='center'
          textAlign={{ base: 'center', md: 'inherit' }}
          width='full'
          flexDir={{ base: 'column', md: 'row' }}
        >
          <Box>
            <Card.Heading as='div' color='gray.500'>
              <Text translation='dashboard.portfolio.portfolioBalance' />
            </Card.Heading>
            <Card.Heading as='h2' fontSize='4xl'>
              <RawText>{`$${totalBalance}`}</RawText>
            </Card.Heading>
          </Box>
          <TimeControls defaultTime={timeframe} onChange={time => setTimeframe(time)} />
        </Card.Header>
        <Card.Body p={0} height='350px'>
          <Graph data={[]} loading={true} />
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>
          <Card.Heading>
            <Text translation='dashboard.portfolio.yourAssets' />
          </Card.Heading>
        </Card.Header>
        <Card.Body px={2} pt={0}>
          <Stack spacing={0}>
            <Grid
              templateColumns={{ base: '1fr repeat(2, 1fr)', lg: '2fr repeat(3, 1fr) 150px' }}
              gap='1rem'
              py={4}
              pl={4}
              pr={4}
            >
              <Text translation='dashboard.portfolio.asset' color='gray.500' />
              <Text translation='dashboard.portfolio.balance' color='gray.500' textAlign='right' />
              <Text
                translation='dashboard.portfolio.price'
                color='gray.500'
                textAlign='right'
                display={{ base: 'none', lg: 'block' }}
              />
              <Text translation='dashboard.portfolio.value' textAlign='right' color='gray.500' />
              <Text
                translation='dashboard.portfolio.allocation'
                color='gray.500'
                textAlign='right'
                display={{ base: 'none', lg: 'block' }}
              />
            </Grid>
            <AccountList />
          </Stack>
        </Card.Body>
      </Card>
    </Stack>
  )
}
