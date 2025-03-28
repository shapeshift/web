import { Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import type { TradeRouterMatchParams } from './types'

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
  const history = useHistory()

  // Extract params directly from location.pathname using matchPath instead of useParams()
  // Somehow, the route below is overriden by /:chainId/:assetSubId/:nftId, so the wrong pattern matching would be used with useParams()
  // There is probably a nicer way to make this work by removing assetIdPaths from trade routes in RoutesCommon,
  // and ensure that other consumers are correctly prefixed with their own route, but spent way too many hours on this and this works for now
  const spotMatch = useMemo(
    () =>
      matchPath<TradeRouterMatchParams>(location.pathname, {
        path: TRADE_ROUTE_ASSET_SPECIFIC,
        exact: true,
      }),
    [location.pathname],
  )

  const limitMatch = useMemo(
    () =>
      matchPath<TradeRouterMatchParams>(location.pathname, {
        path: LIMIT_ORDER_ROUTE_ASSET_SPECIFIC,
        exact: true,
      }),
    [location.pathname],
  )

  const params = spotMatch?.params || limitMatch?.params || {}

  const defaultBuyAssetId = useMemo(
    () =>
      params.chainId && params.assetSubId ? `${params.chainId}/${params.assetSubId}` : undefined,
    [params.chainId, params.assetSubId],
  )

  const defaultSellAssetId = useMemo(
    () =>
      params.sellChainId && params.sellAssetSubId
        ? `${params.sellChainId}/${params.sellAssetSubId}`
        : undefined,
    [params.sellChainId, params.sellAssetSubId],
  )

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(LimitOrderRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          history.push(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [history],
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
          <Switch location={location}>
            <Route key={LimitOrderRoutePaths.Input} path={LimitOrderRoutePaths.Input}>
              <LimitOrder
                tradeInputRef={tradeInputRef}
                onChangeTab={handleChangeTab}
                isRewritingUrl={isRewritingUrl}
                defaultBuyAssetId={defaultBuyAssetId}
                defaultSellAssetId={defaultSellAssetId}
              />
            </Route>
            <Route key={ClaimRoutePaths.Select} path={ClaimRoutePaths.Select}>
              <Claim onChangeTab={handleChangeTab} />
            </Route>
            <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
              <MultiHopTrade
                isRewritingUrl={isRewritingUrl}
                defaultBuyAssetId={defaultBuyAssetId}
                defaultSellAssetId={defaultSellAssetId}
                onChangeTab={handleChangeTab}
              />
            </Route>
          </Switch>
        </FormProvider>
      </Flex>
    </Main>
  )
})
