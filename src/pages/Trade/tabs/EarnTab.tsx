import { Box, Flex } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { TradingErrorBoundary } from '@/components/ErrorBoundary'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { EarnConfirm } from '@/components/MultiHopTrade/components/Earn/EarnConfirm'
import { EarnInput } from '@/components/MultiHopTrade/components/Earn/EarnInput'
import { EarnRoutePaths } from '@/components/MultiHopTrade/components/Earn/types'
import { FiatRampRoutePaths } from '@/components/MultiHopTrade/components/FiatRamps/types'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { blurBackgroundSx, gridOverlaySx } from '@/pages/Trade/constants'
import { EARN_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'

const padding = { base: 0, md: 8 }
const mainPaddingTop = { base: 0, md: '4.5rem' }
const mainMarginTop = { base: 0, md: '-4.5rem' }

const containerPaddingTop = { base: 0, md: 12 }
const containerPaddingBottom = { base: 0, md: 12 }

export const EarnTab = memo(function EarnTab() {
  const translate = useTranslate()
  const methods = useForm({ mode: 'onChange' })
  const navigate = useNavigate()
  const location = useLocation()
  const tradeInputRef = useRef<HTMLDivElement | null>(null)

  const earnMatch = useMemo(
    () => matchPath({ path: EARN_ROUTE_ASSET_SPECIFIC, end: true }, location.pathname),
    [location.pathname],
  )

  const params = earnMatch?.params

  const defaultSellAssetId = useMemo(
    () =>
      params?.sellChainId && params.sellAssetSubId
        ? `${params.sellChainId}/${params.sellAssetSubId}`
        : undefined,
    [params?.sellChainId, params?.sellAssetSubId],
  )

  const defaultYieldId = useMemo(
    () => (params?.yieldId ? decodeURIComponent(params.yieldId) : undefined),
    [params?.yieldId],
  )

  const defaultSellAmountCryptoBaseUnit = useMemo(
    () => params?.sellAmountCryptoBaseUnit,
    [params?.sellAmountCryptoBaseUnit],
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
        case TradeInputTab.Earn:
          navigate(EarnRoutePaths.Input)
          break
        default:
          break
      }
    },
    [navigate],
  )

  const title = useMemo(() => {
    return translate('navBar.earn')
  }, [translate])

  const earnInputElement = useMemo(
    () => (
      <TradingErrorBoundary>
        <EarnInput
          onChangeTab={handleChangeTab}
          tradeInputRef={tradeInputRef}
          defaultSellAssetId={defaultSellAssetId}
          defaultYieldId={defaultYieldId}
          defaultSellAmountCryptoBaseUnit={defaultSellAmountCryptoBaseUnit}
        />
      </TradingErrorBoundary>
    ),
    [handleChangeTab, defaultSellAssetId, defaultYieldId, defaultSellAmountCryptoBaseUnit],
  )

  const earnConfirmElement = useMemo(
    () => (
      <TradingErrorBoundary>
        <EarnConfirm />
      </TradingErrorBoundary>
    ),
    [],
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
              <Route path='confirm' element={earnConfirmElement} />
              <Route path='*' element={earnInputElement} />
            </Routes>
          </FormProvider>
        </Flex>
      </Box>
    </Main>
  )
})
