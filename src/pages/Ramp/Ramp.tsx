import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Button, Card, Flex, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'

import { PageContainer } from '../Buy/components/PageContainer'
import { TopAssets } from '../Buy/TopAssets'

import AuroraBg from '@/assets/aurorabg.jpg'
import FoxPane from '@/assets/fox-cta-pane.png'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatForm } from '@/components/Modals/FiatRamps/views/FiatForm'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useGetFiatRampsQuery } from '@/state/apis/fiatRamps/fiatRamps'
import { selectFiatRampChainCount } from '@/state/apis/fiatRamps/selectors'
import { useAppSelector } from '@/state/store'

type MatchParams = {
  chainId?: string
  assetSubId?: string
}

const layoutMainStyle = { paddingInlineStart: 0, paddingInlineEnd: 0 }
const pageContainerPt = { base: 8, md: '7.5rem' }
const pageContainerPb = { base: 0, md: '7.5rem' }
const flexDirXlRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', xl: 'row' }
const alignItemsXlFlexStart = {
  base: 'center',
  xl: 'flex-start',
}
const textAlignXlLeft: ResponsiveValue<Property.TextAlign> = { base: 'center', xl: 'left' }
const headingFontSize = { base: '4xl', xl: '6xl' }
const cardMxOffsetBase = { base: -4, md: 0 }
const displayXlBlock = { base: 'none', xl: 'block' }
const pageProps = { pt: 0 }

const RampContent: React.FC = () => {
  // load fiat ramps
  useGetFiatRampsQuery()

  const location = useLocation()
  const { chainId, assetSubId } = useParams<MatchParams>()
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId | undefined>()

  const {
    dispatch,
    state: { isConnected },
  } = useWallet()
  const translate = useTranslate()

  const chainCount = useAppSelector(selectFiatRampChainCount)

  const action = location.pathname.includes('/sell') ? FiatRampAction.Sell : FiatRampAction.Buy

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  useEffect(() => {
    // Auto select asset when passed in via params
    if (chainId && assetSubId) {
      setSelectedAssetId(`${chainId}/${assetSubId}`)
    }
  }, [assetSubId, chainId])

  const titleTransaltionsComponents: TextPropTypes['components'] = useMemo(
    () => ({
      span: (
        <RawText
          as='span'
          background='linear-gradient(97.53deg, #F687B3 5.6%, #7B61FF 59.16%, #16D1A1 119.34%)'
          backgroundClip='text'
        />
      ),
    }),
    [],
  )

  const ctaTitleTranslation: TextPropTypes['translation'] = useMemo(
    () => ['buyPage.ctaTitle', { chainCount }],
    [chainCount],
  )

  const ctaTranslationComponents: TextPropTypes['components'] = useMemo(
    () => ({
      span: <RawText as='span' color='white' />,
    }),
    [],
  )

  return (
    <Main p={0} style={layoutMainStyle} pageProps={pageProps}>
      <SEO title={translate('navBar.buyCrypto')} description={translate('buyPage.body')} />
      <Box
        bgImg={AuroraBg}
        backgroundSize='cover'
        backgroundPosition='top center'
        pt='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
      >
        <PageContainer pt={pageContainerPt} pb={pageContainerPb}>
          <Flex
            flexDir={flexDirXlRow}
            alignItems='center'
            justifyContent='space-between'
            width='full'
            gap={6}
          >
            <Flex
              flexDir='column'
              flex={1}
              gap={4}
              alignItems={alignItemsXlFlexStart}
              textAlign={textAlignXlLeft}
            >
              <Text
                as='h2'
                fontSize={headingFontSize}
                lineHeight='1em'
                letterSpacing='-0.05em'
                color='whiteAlpha.900'
                translation='buyPage.title'
                components={titleTransaltionsComponents}
              />

              <Text fontSize='lg' translation='buyPage.body' color='whiteAlpha.900' />
              <Text fontSize='sm' color='text.subtle' translation='buyPage.disclaimer' />
            </Flex>
            <Box flexBasis='400px'>
              <Card bg='background.surface.base' mx={cardMxOffsetBase}>
                <FiatForm assetId={selectedAssetId} fiatRampAction={action} />
              </Card>
            </Box>
          </Flex>
        </PageContainer>
        {!isConnected && (
          <Flex backgroundImage='linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), linear-gradient(180deg, rgba(55, 97, 249, 0) -67.75%, #3761F9 100%)'>
            <PageContainer display='flex' py={0} flexDir={flexDirXlRow} textAlign={textAlignXlLeft}>
              <Stack spacing={4} py='6rem' flex={1} alignItems={alignItemsXlFlexStart}>
                <Text
                  fontSize='2xl'
                  fontWeight='bold'
                  as='h4'
                  color='whiteAlpha.500'
                  translation={ctaTitleTranslation}
                  components={ctaTranslationComponents}
                />
                <Text
                  fontSize='lg'
                  translation={'buyPage.ctaBody'}
                  components={ctaTranslationComponents}
                />
                <Button onClick={handleConnect} size='lg'>
                  {translate('connectWallet.getStarted')}
                </Button>
              </Stack>
              <Box display={displayXlBlock} overflow='visible' width='400px'>
                <Box
                  backgroundImage={FoxPane}
                  backgroundSize='cover'
                  backgroundPosition='center'
                  width='500px'
                  height='500px'
                  ml={-50}
                  mt={-100}
                />
              </Box>
            </PageContainer>
          </Flex>
        )}
      </Box>
      <TopAssets setAssetId={setSelectedAssetId} />
    </Main>
  )
}

export const Ramp: React.FC = () => {
  const rampContentElement = useMemo(() => <RampContent />, [])
  const navigateElement = useMemo(() => <Navigate to='/ramp/buy' replace />, [])

  return (
    <Routes>
      <Route path='/buy/*' element={rampContentElement} />
      <Route path='/sell/*' element={rampContentElement} />
      {/* Default redirect to buy */}
      <Route path='/' element={navigateElement} />
    </Routes>
  )
}
