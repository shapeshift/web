import { Box, Container, Heading, Stack, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { useWallet } from 'hooks/useWallet/useWallet'
import { RecentTransactions } from 'pages/Dashboard/RecentTransactions'
import { TradeCard } from 'pages/Dashboard/TradeCard'

type MatchParams = {
  assetId?: string
}

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
  const { assetId } = useParams<MatchParams>()
  const parsedAssetId = assetId ? decodeURIComponent(assetId) : undefined
  const {
    state: { isDemoWallet },
  } = useWallet()
  const top = isDemoWallet ? '7rem' : '4.5rem'
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Main py={0} px={0} display='flex' flex={1} width='full' titleComponent={<TradeHeader />}>
      <Stack
        direction={{ base: 'column', lg: 'row' }}
        alignSelf='stretch'
        flex={1}
        minHeight={0}
        spacing={0}
      >
        <Box
          height={{ base: 'auto', lg: '100%' }}
          width='full'
          flex={{ base: 'auto', lg: '1 1 0%' }}
          overflow='hidden'
          position='relative'
          pt={12}
          mx={0}
          _before={{
            bg: 'radial-gradient(50% 50% at 50% 50%, rgba(56, 111, 249, 0.045) 0px, rgba(255, 255, 255, 0) 100%)',
            position: 'absolute',
            transform: 'translate(30%, 50%)',
            content: '""',
            width: '100%',
            height: '100%',
          }}
          _after={{
            bg: 'radial-gradient(50% 50% at 50% 50%, rgba(151, 71, 255, 0.045) 0px, rgba(255, 255, 255, 0) 100%)',
            position: 'absolute',
            transform: 'translate(-30%, -50%)',
            content: '""',
            width: '100%',
            height: '100%',
          }}
        >
          <Container
            maxWidth={{ base: '100%', lg: 'container.sm' }}
            px={{ base: 0, lg: 4 }}
            position='relative'
            zIndex='2'
          >
            <TradeCard defaultBuyAssetId={parsedAssetId} />
          </Container>
        </Box>
        <Stack
          flexGrow={1}
          maxWidth={{ base: 'auto', lg: '380px' }}
          borderLeftWidth={{ base: 0, lg: 1 }}
          borderTopWidth={{ base: 1, lg: 0 }}
          borderColor={borderColor}
          height={{ base: 'auto', lg: `calc(100vh - 115px - ${top})` }}
          minHeight={0}
          overflowY='auto'
        >
          <RecentTransactions variant='unstyled' />
        </Stack>
      </Stack>
    </Main>
  )
}
