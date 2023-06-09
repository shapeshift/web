import { Container, Stack } from '@chakra-ui/react'
import foxPageBg from 'assets/foxpage-bg.png'
import { Main } from 'components/Layout/Main'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'
import { RecentTransactions } from 'pages/Dashboard/RecentTransactions'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { selectFeatureFlags } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const Trade = () => {
  const { MultiHopTrades } = useAppSelector(selectFeatureFlags)
  return (
    <Main
      pt='4.5rem'
      mt='-4.5rem'
      px={0}
      display='flex'
      flex={1}
      width='full'
      hideBreadcrumbs
      bgImage={foxPageBg}
      backgroundSize='contain'
      backgroundPosition='top center'
      backgroundRepeat='no-repeat'
    >
      <Stack alignSelf='stretch' flex={1} minHeight={0} spacing={0}>
        <Container
          maxWidth={{ base: '100%', lg: 'container.sm' }}
          p={{ base: 0, md: 8 }}
          position='relative'
          zIndex='2'
        >
          {MultiHopTrades ? <MultiHopTrade /> : <TradeCard />}
        </Container>

        <Stack flexGrow={1}>
          <RecentTransactions variant='unstyled' />
        </Stack>
      </Stack>
    </Main>
  )
}
