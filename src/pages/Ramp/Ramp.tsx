import { Box, Card, Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { PageContainer } from '../Buy/components/PageContainer'
import { TopAssets } from '../Buy/TopAssets'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatForm } from '@/components/Modals/FiatRamps/views/FiatForm'
import { cardstyles } from '@/components/MultiHopTrade/const'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { RampTab } from '@/pages/Trade/tabs/RampTab'
import { useGetFiatRampsQuery } from '@/state/apis/fiatRamps/fiatRamps'

type QueryParams = {
  defaultAsset?: string
}

const layoutMainStyle = { paddingInlineStart: 0, paddingInlineEnd: 0 }
const pageContainerPb = { base: 0, md: '7.5rem' }
const headingFontSize = { base: '4xl', xl: '6xl' }
const cardMxOffsetBase = { base: -4, md: 0 }
const pageProps = { pt: 0 }

const RampContent: React.FC = () => {
  useGetFiatRampsQuery()

  const location = useLocation()
  const query = useQuery<QueryParams>()
  const defaultAssetId = query.defaultAsset as AssetId | undefined

  const isSellRoute = location.pathname.startsWith('/ramp/sell')
  const titleKey = isSellRoute ? 'rampPage.sellTitle' : 'rampPage.buyTitle'
  const bodyKey = isSellRoute ? 'rampPage.sellBody' : 'rampPage.buyBody'

  const translate = useTranslate()

  const action = location.pathname.includes('/sell') ? FiatRampAction.Sell : FiatRampAction.Buy

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

  return (
    <Main p={0} style={layoutMainStyle} pageProps={pageProps}>
      <SEO title={translate('navBar.buyCrypto')} description={translate(bodyKey)} />
      <Box pt='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'>
        <PageContainer pt={12} pb={pageContainerPb}>
          <Flex
            flexDir='column'
            alignItems='center'
            justifyContent='center'
            width='full'
            mx='auto'
            maxWidth='container.md'
            textAlign='center'
            gap={6}
          >
            <Flex flexDir='column' flex={1} gap={4} alignItems='center' textAlign='center'>
              <Text
                as='h2'
                fontSize={headingFontSize}
                lineHeight='1em'
                letterSpacing='-0.05em'
                color='text.base'
                translation={titleKey}
                components={titleTransaltionsComponents}
              />

              <Text fontSize='lg' translation={bodyKey} color='text.base' />
              <Text fontSize='sm' color='text.subtle' translation='rampPage.disclaimer' />
            </Flex>
            <Box flexBasis='400px' textAlign='left'>
              <Card mx={cardMxOffsetBase} {...cardstyles}>
                <FiatForm assetId={defaultAssetId} fiatRampAction={action} />
              </Card>
            </Box>
          </Flex>
        </PageContainer>
      </Box>
      <TopAssets />
    </Main>
  )
}

const rampContentElement = <RampContent />
const navigateElement = <Navigate to='buy' replace />
const rampTabElement = <RampTab />

export const Ramp: React.FC = () => {
  return (
    <Routes>
      <Route path='buy/*' element={rampContentElement} />
      <Route path='sell/*' element={rampContentElement} />
      <Route path='trade/buy' element={rampTabElement} />
      <Route path='trade/sell' element={rampTabElement} />
      <Route index element={navigateElement} />
    </Routes>
  )
}
