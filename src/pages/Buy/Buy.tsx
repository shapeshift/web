import { Box, Button, Flex, Heading, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router'
import AuroraBg from 'assets/aurorabg.jpg'
import FoxPane from 'assets/fox-cta-pane.png'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { FiatForm } from 'components/Modals/FiatRamps/views/FiatForm'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useFetchFiatAssetMarketData } from 'state/apis/fiatRamps/selectors'

import { PageContainer } from './components/PageContainer'
import { TopAssets } from './TopAssets'

type MatchParams = {
  chainId?: string
  assetSubId?: string
}

export const Buy = () => {
  const { chainId, assetSubId } = useParams<MatchParams>()
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(ethAssetId)
  const {
    dispatch,
    state: { isConnected, isDemoWallet },
  } = useWallet()
  const translate = useTranslate()

  useFetchFiatAssetMarketData()

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  useEffect(() => {
    // Auto select asset when passed in via params
    if (chainId && assetSubId) {
      const assetId = `${chainId}/${assetSubId}`
      setSelectedAssetId(assetId)
    }
  }, [assetSubId, chainId])

  return (
    <Main p={0} style={{ paddingInlineStart: 0, paddingInlineEnd: 0 }}>
      <SEO title={translate('navBar.buyCrypto')} description={translate('buyPage.body')} />
      <Box bgImg={AuroraBg} backgroundSize='cover' backgroundPosition='top center'>
        <PageContainer pt={{ base: 8, md: '7.5rem' }} pb={{ base: 0, md: '7.5rem' }}>
          <Flex
            flexDir={{ base: 'column', xl: 'row' }}
            alignItems='center'
            justifyContent='space-between'
            width='full'
            gap={6}
          >
            <Flex
              flexDir='column'
              flex={1}
              gap={4}
              alignItems={{ base: 'center', xl: 'flex-start' }}
              textAlign={{ base: 'center', xl: 'left' }}
            >
              <Heading
                fontSize={{ base: '4xl', xl: '6xl' }}
                lineHeight='1em'
                letterSpacing='-0.05em'
                color='whiteAlpha.900'
              >
                {translate('buyPage.title.first')}{' '}
                <Text
                  as='span'
                  background='linear-gradient(97.53deg, #F687B3 5.6%, #7B61FF 59.16%, #16D1A1 119.34%)'
                  backgroundClip='text'
                  translation='buyPage.title.second'
                />
              </Heading>
              <Text fontSize='lg' translation='buyPage.body' color='whiteAlpha.900' />
              <Text fontSize='sm' color='gray.500' translation='buyPage.disclaimer' />
            </Flex>
            <Box flexBasis='400px'>
              <Card mx={{ base: -4, md: 0 }}>
                <FiatForm assetId={selectedAssetId} fiatRampAction={FiatRampAction.Buy} />
              </Card>
            </Box>
          </Flex>
        </PageContainer>
        {(!isConnected || isDemoWallet) && (
          <Flex backgroundImage='linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), linear-gradient(180deg, rgba(55, 97, 249, 0) -67.75%, #3761F9 100%)'>
            <PageContainer
              display='flex'
              py={0}
              flexDir={{ base: 'column', xl: 'row' }}
              textAlign={{ base: 'center', xl: 'left' }}
            >
              <Stack
                spacing={4}
                py='6rem'
                flex={1}
                alignItems={{ base: 'center', xl: 'flex-start' }}
              >
                <Heading fontSize='2xl' fontWeight='bold' as='h4' color='whiteAlpha.500'>
                  {translate('buyPage.cta.title.first')}{' '}
                  <Text as='span' color='white' translation='buyPage.cta.title.second' />
                </Heading>
                <Button
                  size='lg'
                  data-test='buy-page-connect-wallet-button'
                  variant='solid'
                  colorScheme='blue'
                  onClick={handleConnect}
                >
                  {translate('common.connectWallet')}
                </Button>
              </Stack>
              <Box
                width='300px'
                bgImage={FoxPane}
                backgroundSize='cover'
                display={{ base: 'none', xl: 'block' }}
              />
            </PageContainer>
          </Flex>
        )}
      </Box>
      <TopAssets />
    </Main>
  )
}
