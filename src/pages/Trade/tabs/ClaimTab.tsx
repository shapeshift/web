import { Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { Claim } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/Claim'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'

const padding = { base: 0, md: 8 }
const mainPaddingTop = { base: 0, md: '4.5rem' }
const mainMarginTop = { base: 0, md: '-4.5rem' }

const containerPaddingTop = { base: 0, md: 12 }
const containerPaddingBottom = { base: 0, md: 12 }

export const ClaimTab = memo(() => {
  const translate = useTranslate()
  const methods = useForm({ mode: 'onChange' })
  const navigate = useNavigate()

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
    return translate('navBar.claims')
  }, [translate])

  const claimElement = useMemo(() => <Claim onChangeTab={handleChangeTab} />, [handleChangeTab])

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
            <Route key={ClaimRoutePaths.Select} path={'*'} element={claimElement} />
          </Routes>
        </FormProvider>
      </Flex>
    </Main>
  )
})
