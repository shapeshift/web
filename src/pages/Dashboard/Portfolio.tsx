import { Box, Grid, Spinner, Stack } from '@chakra-ui/react'
import { marketService } from '@shapeshiftoss/types'
import { useState } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { RawText, Text } from 'components/Text'
import { useBalances } from 'hooks/useBalances/useBalances'

import { AssetList } from './components/AssetList/AssetList'

export const Portfolio = () => {
  const [timeframe, setTimeframe] = useState(marketService.HistoryTimeframe.YEAR)
  const { balances, loading } = useBalances()

  if (loading)
    return (
      <Box d='flex' width='full' justifyContent='center' alignItems='center'>
        <Spinner />
      </Box>
    )

  return (
    <Stack spacing={6} width='full' p={4}>
      <Card variant='footer-stub'>
        <Card.Header display='flex' justifyContent='space-between' alignItems='center' width='full'>
          <Box>
            <Card.Heading as='div' color='gray.500'>
              <Text translation='dashboard.portfolio.portfolioBalance' />
            </Card.Heading>
            <Card.Heading as='h2' fontSize='4xl'>
              <RawText>$12,000.20</RawText>
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
              templateColumns={{ base: '1fr auto', lg: '2fr repeat(3, 1fr)' }}
              gap='1rem'
              py={4}
              pl={4}
              pr={4}
            >
              <Text translation='dashboard.portfolio.asset' color='gray.500' />
              <Text translation='dashboard.portfolio.balance' color='gray.500' textAlign='right' />
              <Text
                translation='dashboard.portfolio.price'
                textAlign='right'
                color='gray.500'
                display={{ base: 'none', lg: 'block' }}
              />
              <Text
                translation='dashboard.portfolio.allocation'
                color='gray.500'
                textAlign='right'
                display={{ base: 'none', lg: 'block' }}
              />
            </Grid>
            <AssetList balances={balances} />
          </Stack>
        </Card.Body>
      </Card>
    </Stack>
  )
}
