import { Flex } from '@chakra-ui/react'
import { memo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation, useParams } from 'react-router-dom'

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
  const params = useParams<MatchParams>()
  const tradeInputRef = useRef<HTMLDivElement | null>(null)
  const methods = useForm({ mode: 'onChange' })
  const history = useHistory()

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
