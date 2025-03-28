import { Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { LimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/LimitOrder'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { Claim } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/Claim'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { LIMIT_ORDER_ROUTE_ASSET_SPECIFIC, TRADE_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'

const padding = { base: 0, md: 8 }

export const Trade = memo(() => {
  const translate = useTranslate()
  const location = useLocation()
  const tradeInputRef = useRef<HTMLDivElement | null>(null)
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
    switch (true) {
      case location.pathname.startsWith(LimitOrderRoutePaths.Input):
        return translate('navBar.limitOrder')
      case location.pathname.startsWith(ClaimRoutePaths.Select):
        return translate('navBar.claims')
      default:
        return translate('navBar.trade')
    }
  }, [location.pathname, translate])

  // Only rewrite for /trade (input) else problems, we'll be redirected back to input on confirm
  const isRewritingUrl = useMemo(
    () =>
      ![
        TradeRoutePaths.Confirm,
        TradeRoutePaths.QuoteList,
        TradeRoutePaths.VerifyAddresses,
        LimitOrderRoutePaths.Confirm,
        LimitOrderRoutePaths.Orders,
      ].includes(location.pathname as TradeRoutePaths),
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

  const claimElement = useMemo(() => <Claim onChangeTab={handleChangeTab} />, [handleChangeTab])

  const tradeElement = useMemo(
    () => (
      <MultiHopTrade
        isRewritingUrl={isRewritingUrl}
        defaultBuyAssetId={defaultBuyAssetId}
        defaultSellAssetId={defaultSellAssetId}
        onChangeTab={handleChangeTab}
      />
    ),
    [handleChangeTab, isRewritingUrl, defaultBuyAssetId, defaultSellAssetId],
  )

  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full'>
      <SEO title={title} />
      <Flex
        pt={12}
        px={padding}
        pb={12}
        alignItems='flex-start'
        width='full'
        justifyContent='center'
        gap={4}
      >
        <FormProvider {...methods}>
          <Routes>
            <Route
              key={LimitOrderRoutePaths.Input}
              path={LimitOrderRoutePaths.Input}
              element={limitOrderElement}
            />
            <Route
              key={ClaimRoutePaths.Select}
              path={ClaimRoutePaths.Select}
              element={claimElement}
            />
            <Route
              key={TradeRoutePaths.Input}
              path={TradeRoutePaths.Input}
              element={tradeElement}
            />
          </Routes>
        </FormProvider>
      </Flex>
    </Main>
  )
})
