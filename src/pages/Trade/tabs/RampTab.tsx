import { Box, Flex } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { RampErrorBoundary } from '@/components/ErrorBoundary/RampErrorBoundary'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { FiatRampTrade } from '@/components/MultiHopTrade/components/FiatRamps/FiatRampTrade'
import { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { blurBackgroundSx, gridOverlaySx } from '@/pages/Trade/constants'

const padding = { base: 0, md: 8 }
const mainPaddingTop = { base: 0, md: '4.5rem' }
const mainMarginTop = { base: 0, md: '-4.5rem' }

const containerPaddingTop = { base: 0, md: 12 }
const containerPaddingBottom = { base: 0, md: 12 }

export const RampTab = () => {
  const translate = useTranslate()
  const methods = useForm({ mode: 'onChange' })
  const navigate = useNavigate()
  const location = useLocation()

  const type = useMemo(() => {
    return location.pathname.includes(FiatRampRoutePaths.Buy)
      ? FiatRampAction.Buy
      : FiatRampAction.Sell
  }, [location.pathname])

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

  const buyElement = useMemo(
    () => (
      <RampErrorBoundary>
        <FiatRampTrade direction={type} onChangeTab={handleChangeTab} />
      </RampErrorBoundary>
    ),
    [handleChangeTab, type],
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
              <Route key={FiatRampRoutePaths.Buy} path={'*'} element={buyElement} />
            </Routes>
          </FormProvider>
        </Flex>
      </Box>
    </Main>
  )
}
