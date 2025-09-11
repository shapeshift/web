import { Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { RampErrorBoundary } from '@/components/ErrorBoundary/RampErrorBoundary'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampTrade } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTrade'
import { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { LIMIT_ORDER_ROUTE_ASSET_SPECIFIC, TRADE_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'

const padding = { base: 0, md: 8 }
const mainPaddingTop = { base: 0, md: '4.5rem' }
const mainMarginTop = { base: 0, md: '-4.5rem' }

const containerPaddingTop = { base: 0, md: 12 }
const containerPaddingBottom = { base: 0, md: 12 }

export const BuyTab = memo(() => {
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
        case TradeInputTab.BuyFiat:
          navigate(FiatRampRoutePaths.Buy)
          break
        case TradeInputTab.SellFiat:
          navigate(FiatRampRoutePaths.Sell)
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

  const buyElement = useMemo(
    () => (
      <RampErrorBoundary>
        <FiatRampTrade type='buy' onChangeTab={handleChangeTab} />
      </RampErrorBoundary>
    ),
    [handleChangeTab],
  )

  return (
    <Main pt={mainPaddingTop} mt={mainMarginTop} px={0} display='flex' flex={1} width='full'>
      <SEO title={title} />
      <Flex
        pt={containerPaddingTop}
        px={padding}
        pb={containerPaddingBottom}
        alignItems='flex-start'
        width='full'
        justifyContent='center'
        gap={4}
      >
        <FormProvider {...methods}>
          <Routes>
            <Route key={FiatRampRoutePaths.Buy} path={'*'} element={buyElement} />
          </Routes>
        </FormProvider>
      </Flex>
    </Main>
  )
})
