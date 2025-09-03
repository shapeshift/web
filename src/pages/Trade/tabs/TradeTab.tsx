import { Flex } from '@chakra-ui/react'
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
    <Main 
      pt={mainPaddingTop} 
      mt={mainMarginTop} 
      px={0} 
      display='flex' 
      flex={1} 
      width='full'
      position='relative'
      _before={{
        content: '""',
        position: 'fixed',
        bottom: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1200px',
        height: '30vh',
        background: 'radial-gradient(ellipse 120% 100% at 50% 100%, rgba(55, 97, 249, 1) 0%, rgba(55, 97, 249, 0.6) 30%, rgba(55, 97, 249, 0) 100%)',
        filter: 'blur(300px)',
        zIndex: 0,
        pointerEvents: 'none',
      }}
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
        position='relative'
        zIndex={1}
      >
        <FormProvider {...methods}>
          <Routes>
            <Route key={TradeRoutePaths.Input} path={'*'} element={tradeElement} />
          </Routes>
        </FormProvider>
      </Flex>
    </Main>
  )
})
