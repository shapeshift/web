import { Box, Container, Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { RecentTransactions } from 'pages/Dashboard/RecentTransactions'
import { TradeCard } from 'pages/Dashboard/TradeCard'

const TradeHeader = () => {
  const translate = useTranslate()
  return (
    <Box pb={6}>
      <SEO title={translate('trade.trade')} />
      <Heading>{translate('trade.trade')}</Heading>
    </Box>
  )
}

export const Trade = () => {
  return (
    <Main
      py={0}
      px={0}
      display='flex'
      flex={1}
      width='full'
      hideBreadcrumbs
      titleComponent={<TradeHeader />}
    >
      <Stack alignSelf='stretch' flex={1} minHeight={0} spacing={0}>
        <Container
          maxWidth={{ base: '100%', lg: 'container.sm' }}
          p={{ base: 0, md: 8 }}
          position='relative'
          zIndex='2'
        >
          <TradeCard />
        </Container>

        <Stack flexGrow={1}>
          <RecentTransactions variant='unstyled' />
        </Stack>
      </Stack>
    </Main>
  )
}
