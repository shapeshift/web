import { Flex } from '@chakra-ui/react'
import { memo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useLocation } from 'react-router-dom'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { LimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/LimitOrder'
import { Claim } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/Claim'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import type { TradeInputTab } from '@/components/MultiHopTrade/types'

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
  const match = matchPath<MatchParams>(location.pathname, {
    path: '/trade/:chainId/:assetSubId/:sellChainId/:sellAssetSubId/:sellAmountCryptoBaseUnit',
    exact: true,
  })

  const params = match?.params || {}

  // Extract asset IDs from params if available
  const defaultBuyAssetId =
    params.chainId && params.assetSubId ? `${params.chainId}/${params.assetSubId}` : undefined

  const defaultSellAssetId =
    params.sellChainId && params.sellAssetSubId
      ? `${params.sellChainId}/${params.sellAssetSubId}`
      : undefined

  const handleChangeTab = (newTab: TradeInputTab) => {
    switch (newTab) {
      case 'trade':
        history.push('/trade')
        break
      case 'limitOrder':
        history.push('/limit')
        break
      case 'claim':
        history.push('/claim')
        break
      default:
        break
    }
  }

  // Check if we're on a limit route
  const isLimitRoute = location.pathname.startsWith('/limit')

  // Check if we're on a claim route
  const isClaimRoute = location.pathname.startsWith('/claim')

  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full'>
      <SEO
        title={translate(
          isLimitRoute ? 'navBar.limitOrder' : isClaimRoute ? 'navBar.claim' : 'navBar.trade',
        )}
      />
      <Flex
        pt={12}
        px={padding}
        alignItems='flex-start'
        width='full'
        justifyContent='center'
        gap={4}
      >
        <FormProvider {...methods}>
          {isLimitRoute ? (
            <LimitOrder tradeInputRef={tradeInputRef} onChangeTab={handleChangeTab} />
          ) : isClaimRoute ? (
            <Claim onChangeTab={handleChangeTab} />
          ) : (
            <MultiHopTrade
              isRewritingUrl
              defaultBuyAssetId={defaultBuyAssetId}
              defaultSellAssetId={defaultSellAssetId}
            />
          )}
        </FormProvider>
      </Flex>
    </Main>
  )
})
