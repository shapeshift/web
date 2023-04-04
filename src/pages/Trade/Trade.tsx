import { Box, Container, Heading, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { useWallet } from 'hooks/useWallet/useWallet'
import { RecentTransactions } from 'pages/Dashboard/RecentTransactions'
import { TradeCard } from 'pages/Dashboard/TradeCard'

type MatchParams = {
  chainId?: string
  assetSubId?: string
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
  const { chainId, assetSubId } = useParams<MatchParams>()
  const [passedAssetId, setPassedAssetId] = useState<AssetId>(ethAssetId)
  const {
    state: { isDemoWallet },
  } = useWallet()
  const top = isDemoWallet ? '7rem' : '4.5rem'
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  useEffect(() => {
    // Auto select asset when passed in via params
    if (chainId && assetSubId) {
      const assetId = `${chainId}/${assetSubId}`
      setPassedAssetId(assetId)
    }
  }, [assetSubId, chainId])
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
        <Box width='full' overflow='hidden' position='relative'>
          <Container
            maxWidth={{ base: '100%', lg: 'container.sm' }}
            p={{ base: 0, md: 8 }}
            position='relative'
            zIndex='2'
          >
            <TradeCard defaultBuyAssetId={passedAssetId} />
          </Container>
        </Box>
        <Stack flexGrow={1}>
          <RecentTransactions variant='unstyled' />
        </Stack>
      </Stack>
    </Main>
  )
}
