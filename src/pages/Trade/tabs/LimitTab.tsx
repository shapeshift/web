import { Box, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { LimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/LimitOrder'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { blurBackgroundSx, gridOverlaySx } from '@/pages/Trade/constants'
import { LIMIT_ORDER_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'

const padding = { base: 0, md: 8 }
const mainPaddingTop = { base: 0, md: '4.5rem' }
const mainMarginTop = { base: 0, md: '-4.5rem' }

const containerPaddingTop = { base: 0, md: 12 }
const containerPaddingBottom = { base: 0, md: 12 }

export const LimitTab = memo(() => {
  const translate = useTranslate()
  const location = useLocation()
  const tradeInputRef = useRef<HTMLDivElement | null>(null)
  const methods = useForm({ mode: 'onChange' })
  const navigate = useNavigate()

  // Extract params directly from location.pathname using matchPath instead of useParams()
  // Somehow, the route below is overriden by /:chainId/:assetSubId/:nftId, so the wrong pattern matching would be used with useParams()
  // There is probably a nicer way to make this work by removing assetIdPaths from trade routes in RoutesCommon,
  // and ensure that other consumers are correctly prefixed with their own route, but spent way too many hours on this and this works for now

  const limitMatch = useMemo(
    () => matchPath({ path: LIMIT_ORDER_ROUTE_ASSET_SPECIFIC, end: true }, location.pathname),
    [location.pathname],
  )

  const params = limitMatch?.params

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
    return translate('navBar.limitOrder')
  }, [translate])

  // Only rewrite for /trade (input) else problems, we'll be redirected back to input on confirm
  const isRewritingUrl = useMemo(
    () =>
      ![
        TradeRoutePaths.Confirm,
        TradeRoutePaths.QuoteList,
        TradeRoutePaths.VerifyAddresses,
        LimitOrderRoutePaths.Confirm,
        LimitOrderRoutePaths.Orders,
      ].some(path => location.pathname.includes(path)),
    [location.pathname],
  )

  const limitOrderElement = useMemo(
    () => (
      <LimitOrder
        tradeInputRef={tradeInputRef}
        onChangeTab={handleChangeTab}
        isRewritingUrl={isRewritingUrl}
        defaultBuyAssetId={defaultBuyAssetId}
        defaultSellAssetId={defaultSellAssetId}
      />
    ),
    [handleChangeTab, isRewritingUrl, defaultBuyAssetId, defaultSellAssetId],
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
              <Route key={LimitOrderRoutePaths.Input} path={'*'} element={limitOrderElement} />
            </Routes>
          </FormProvider>
        </Flex>
      </Box>
    </Main>
  )
})
