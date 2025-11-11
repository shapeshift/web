import { Box, Flex, useMediaQuery } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { TradingErrorBoundary } from '@/components/ErrorBoundary'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { TopAssetsCarousel } from '@/components/MultiHopTrade/components/TradeInput/components/TopAssetsCarousel'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { selectHasUserEnteredAmount } from '@/state/slices/tradeInputSlice/selectors'
import { blurBackgroundSx, gridOverlaySx } from '@/pages/Trade/constants'
import { LIMIT_ORDER_ROUTE_ASSET_SPECIFIC, TRADE_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

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
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)

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
        case TradeInputTab.BuyFiat:
          navigate(FiatRampRoutePaths.Buy)
          break
        case TradeInputTab.SellFiat:
          navigate(FiatRampRoutePaths.Sell)
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

  const shouldShowCarousel = useMemo(() => {
    return !isSmallerThanMd && !hasUserEnteredAmount
  }, [isSmallerThanMd, hasUserEnteredAmount])

  const bottomPadding = useMemo(() => {
    return shouldShowCarousel ? { base: 0, md: '180px' } : containerPaddingBottom
  }, [shouldShowCarousel])

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
          pb={bottomPadding}
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
        <TopAssetsCarousel />
      </Box>
    </Main>
  )
})
