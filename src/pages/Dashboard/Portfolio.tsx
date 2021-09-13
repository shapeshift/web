import { Box, Grid, Spinner, Stack } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/asset-service'
import { HistoryTimeframe } from '@shapeshiftoss/market-service'
import { useState } from 'react'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { RawText, Text } from 'components/Text'
// import { HistoryTimeframe } from 'lib/assets/getAssetData'
import { useBalances } from 'hooks/useBalances/useBalances'

import { AssetList } from './components/AssetList/AssetList'

// TODO: Combined Portfolio Asset Chart
const asset = {
  icon: 'https://static.coincap.io/assets/icons/256/btc.png',
  displayName: 'Bitcoin',
  network: NetworkTypes.MAINNET,
  symbol: 'BTC',
  price: '1000',
  marketCap: '1000',
  volume: '1000',
  changePercent24Hr: 25,
  description: 'loremIpsum',
  name: 'bitcoin',
  precision: 18,
  color: '0',
  secondaryColor: '0',
  chain: ChainTypes.BTC,
  sendSupport: false,
  receiveSupport: false
}

export const Portfolio = () => {
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.YEAR)
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
          <Graph asset={asset} timeframe={HistoryTimeframe.YEAR} />
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
