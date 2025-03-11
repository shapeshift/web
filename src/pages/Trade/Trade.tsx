import { Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { LimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/LimitOrder'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { Claim } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/Claim'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import type { TradeInputTab } from '@/components/MultiHopTrade/types'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'

const padding = { base: 0, md: 8 }

type MatchParams = {
  chainId?: string
  assetSubId?: string
  sellAssetSubId?: string
  sellChainId?: string
  sellAmountCryptoBaseUnit?: string
}

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
  const match = useMemo(
    () =>
      matchPath<MatchParams>(location.pathname, {
        path: `${TradeRoutePaths.Input}/:chainId/:assetSubId/:sellChainId/:sellAssetSubId/:sellAmountCryptoBaseUnit`,
        exact: true,
      }),
    [location.pathname],
  )

  const params = match?.params || {}

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
        case 'trade':
          history.push(TradeRoutePaths.Input)
          break
        case 'limitOrder':
          history.push(LimitOrderRoutePaths.Input)
          break
        case 'claim':
          history.push(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [history],
  )

  const title = useMemo(() => {
    if (location.pathname.startsWith(LimitOrderRoutePaths.Input)) {
      return translate('navBar.limitOrder')
    }
    if (location.pathname.startsWith(ClaimRoutePaths.Select)) {
      return translate('navBar.claims')
    }
    return translate('navBar.trade')
  }, [location.pathname, translate])

  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full'>
      <SEO title={title} />
      <Flex
        pt={12}
        px={padding}
        alignItems='flex-start'
        width='full'
        justifyContent='center'
        gap={4}
      >
        <FormProvider {...methods}>
          <Switch location={location}>
            <Route path={LimitOrderRoutePaths.Input}>
              <LimitOrder tradeInputRef={tradeInputRef} onChangeTab={handleChangeTab} />
            </Route>
            <Route path={ClaimRoutePaths.Select}>
              <Claim onChangeTab={handleChangeTab} />
            </Route>
            <Route path={TradeRoutePaths.Input}>
              <MultiHopTrade
                isRewritingUrl
                defaultBuyAssetId={defaultBuyAssetId}
                defaultSellAssetId={defaultSellAssetId}
              />
            </Route>
          </Switch>
        </FormProvider>
      </Flex>
    </Main>
  )
})
