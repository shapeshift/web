import { Box, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { TradingErrorBoundary } from '@/components/ErrorBoundary'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { LIMIT_ORDER_ROUTE_ASSET_SPECIFIC, TRADE_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'

const padding = { base: 0, md: 8 }
const mainPaddingTop = { base: 0, md: '4.5rem' }
const mainMarginTop = { base: 0, md: '-4.5rem' }

const containerPaddingTop = { base: 0, md: 12 }
const containerPaddingBottom = { base: 0, md: 12 }

const gridOverlaySx = {
  content: '""',
  position: 'fixed' as const,
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundImage:
    'linear-gradient(to right, rgba(255, 255, 255, 0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.01) 1px, transparent 1px)',
  backgroundSize: '30px 30px',
  maskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
  zIndex: 0,
  pointerEvents: 'none' as const,
}

const blurBackgroundSx = {
  content: '""',
  position: 'fixed' as const,
  bottom: '0',
  left: '0',
  right: '0',
  height: '40vh',
  background:
    'radial-gradient(ellipse 150% 80% at 50% 100%, rgba(55, 97, 249, 1) 0%, rgba(55, 97, 249, 0.9) 20%, rgba(55, 97, 249, 0.4) 50%, rgba(55, 97, 249, 0) 80%), radial-gradient(ellipse 120% 70% at 20% 100%, rgba(165, 55, 249, 1) 0%, rgba(165, 55, 249, 0.8) 20%, rgba(165, 55, 249, 0.3) 50%, rgba(165, 55, 249, 0) 80%), radial-gradient(ellipse 100% 60% at 80% 100%, rgba(22, 209, 161, 0.6) 0%, rgba(22, 209, 161, 0.2) 40%, rgba(22, 209, 161, 0) 80%)',
  filter: 'blur(200px)',
  zIndex: 0.5,
  pointerEvents: 'none' as const,
}

export const TradeTab = memo(() => {
  const translate = useTranslate()
  const location = useLocation()
  const methods = useForm({ mode: 'onChange' })
  const navigate = useNavigate()

  // Extract params directly from location.pathname using matchPath instead of useParams()
  // Somehow, the route below is overriden by /:chainId/:assetSubId/:nftId, so the wrong pattern matching would be used with useParams()
  // There is probably a nicer way to make this work by removing assetIdPaths from trade routes in RoutesCommon,
  // and ensure that other consumers are correctly prefixed with their own route, but spent way too many hours on this and this works for now
  const spotMatch = useMemo(
    () => matchPath({ path: TRADE_ROUTE_ASSET_SPECIFIC, end: true }, location.pathname),
    [location.pathname],
  )

  const limitMatch = useMemo(
    () => matchPath({ path: LIMIT_ORDER_ROUTE_ASSET_SPECIFIC, end: true }, location.pathname),
    [location.pathname],
  )

  const params = spotMatch?.params || limitMatch?.params

  const defaultBuyAssetId = useMemo(
    () =>
      params?.chainId && params.assetSubId ? `${params.chainId}/${params.assetSubId}` : undefined,
    [params?.chainId, params?.assetSubId],
  )

  const defaultSellAssetId = useMemo(
    () =>
      params?.sellChainId && params.sellAssetSubId
        ? `${params.sellChainId}/${params.sellAssetSubId}`
        : undefined,
    [params?.sellChainId, params?.sellAssetSubId],
  )

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          navigate(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          navigate(LimitOrderRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          navigate(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [navigate],
  )

  const title = useMemo(() => {
    return translate('navBar.trade')
  }, [translate])

  const tradeElement = useMemo(
    () => (
      <TradingErrorBoundary>
        <MultiHopTrade
          defaultBuyAssetId={defaultBuyAssetId}
          defaultSellAssetId={defaultSellAssetId}
          onChangeTab={handleChangeTab}
        />
      </TradingErrorBoundary>
    ),
    [handleChangeTab, defaultBuyAssetId, defaultSellAssetId],
  )

  return (
    <Main pt={mainPaddingTop} mt={mainMarginTop} px={0} display='flex' flex={1} width='full'>
      <Box
        position='relative'
        width='full'
        display='flex'
        flex={1}
        _before={gridOverlaySx}
        _after={blurBackgroundSx}
      >
        <SEO title={title} />
        <Flex
          pt={containerPaddingTop}
          px={padding}
          pb={containerPaddingBottom}
          alignItems='flex-start'
          width='full'
          justifyContent='center'
          gap={4}
          zIndex={2}
          position='relative'
        >
          <FormProvider {...methods}>
            <Routes>
              <Route key={TradeRoutePaths.Input} path={'*'} element={tradeElement} />
            </Routes>
          </FormProvider>
        </Flex>
      </Box>
    </Main>
  )
})
