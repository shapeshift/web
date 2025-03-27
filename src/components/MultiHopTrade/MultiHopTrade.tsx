import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'

import { QuoteList } from './components/QuoteList/QuoteList'
import { SlideTransitionRoute } from './components/SlideTransitionRoute'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { VerifyAddresses } from './components/VerifyAddresses/VerifyAddresses'
import { useGetTradeRates } from './hooks/useGetTradeQuotes/useGetTradeRates'
import type { TradeInputTab } from './types'
import { TradeRoutePaths } from './types'

import { fromBaseUnit } from '@/lib/math'
import type { TradeRouterMatchParams } from '@/pages/Trade/types'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type TradeCardProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
  isCompact?: boolean
  isRewritingUrl?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

// dummy component to allow us to mount or unmount the `useGetTradeRates` hook conditionally
const GetTradeRates = () => {
  useGetTradeRates()
  return <></>
}

export const MultiHopTrade = memo(
  ({
    defaultBuyAssetId,
    defaultSellAssetId,
    defaultSellAssetAccountId,
    defaultInputAmount,
    isCrosshop,
    isCompact,
    isRewritingUrl,
    onChangeTab,
    isStandalone,
  }: any) => {
    const location = useLocation()
    const navigate = useNavigate()
    const params = useParams<TradeRouterMatchParams>()
    const dispatch = useAppDispatch()
    const methods = useForm({ mode: 'onChange' })

    const chainId = params?.chainId
    const assetSubId = params?.assetSubId
    const sellChainId = params?.sellChainId
    const sellAssetSubId = params?.sellAssetSubId
    const paramsSellAmountCryptoBaseUnit = params?.sellAmountCryptoBaseUnit

    const sellAsset = useAppSelector(selectInputSellAsset)
    const buyAsset = useAppSelector(selectInputBuyAsset)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isInitialMount, setIsInitialMount] = useState(true)

    const sellInputAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)

    useEffect(() => {
      if (!isInitialMount || isStandalone) return

      dispatch(tradeInput.actions.clear())

      if (isRewritingUrl) {
        navigate(`/trade/${buyAsset.assetId}/${sellAsset.assetId}/0`)
      }

      setIsInitialMount(false)
    }, [
      dispatch,
      isStandalone,
      isInitialMount,
      isRewritingUrl,
      buyAsset.assetId,
      sellAsset.assetId,
    ])

    useEffect(() => {
      if (!isRewritingUrl || isStandalone || isInitialMount) return

      const sellAmountBaseUnit =
        sellInputAmountCryptoBaseUnit ?? paramsSellAmountCryptoBaseUnit ?? ''
      navigate(`/trade/${buyAsset.assetId}/${sellAsset.assetId}/${sellAmountBaseUnit ?? ''}`)
    }, [
      isInitialMount,
      isRewritingUrl,
      isStandalone,
      buyAsset,
      sellAsset,
      sellInputAmountCryptoBaseUnit,
      paramsSellAmountCryptoBaseUnit,
    ])

    const buyAssetId = useMemo(() => {
      if (defaultBuyAssetId) return defaultBuyAssetId
      if (chainId && assetSubId) return `${chainId}/${assetSubId}`
      return ''
    }, [defaultBuyAssetId, chainId, assetSubId])

    const sellAssetId = useMemo(() => {
      if (defaultSellAssetId) return defaultSellAssetId
      if (sellChainId && sellAssetSubId) return `${sellChainId}/${sellAssetSubId}`
      return ''
    }, [defaultSellAssetId, sellChainId, sellAssetSubId])

    const routeSellAsset = useAppSelector(state => selectAssetById(state, sellAssetId))
    const routeBuyAsset = useAppSelector(state => selectAssetById(state, buyAssetId))

    useEffect(() => {
      // Absolutely needed or else we'll end up in a loop
      if (isInitialized) return

      if (routeBuyAsset) {
        dispatch(tradeInput.actions.setBuyAsset(routeBuyAsset))
      }

      if (routeSellAsset) {
        dispatch(tradeInput.actions.setSellAsset(routeSellAsset))
      }

      if (paramsSellAmountCryptoBaseUnit && routeSellAsset) {
        dispatch(
          tradeInput.actions.setSellAmountCryptoPrecision(
            fromBaseUnit(paramsSellAmountCryptoBaseUnit, routeSellAsset.precision),
          ),
        )
      }

      setIsInitialized(true)
    }, [dispatch, routeBuyAsset, routeSellAsset, paramsSellAmountCryptoBaseUnit, isInitialized])

    return (
      <FormProvider {...methods}>
        <TradeRoutes isCompact={isCompact} onChangeTab={onChangeTab} isStandalone={isStandalone} />
      </FormProvider>
    )
  },
)

type TradeRoutesProps = {
  isCompact?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

const TradeRoutes = memo(({ isCompact, isStandalone, onChangeTab }: TradeRoutesProps) => {
  const location = useLocation()
  const navigate = useNavigate()

  console.log('TradeRoutes location.pathname:', location.pathname)

  const tradeInputRef = useRef<HTMLDivElement | null>(null)

  // Add a useEffect to determine which route should be rendered based on the full URL
  useEffect(() => {
    console.log('Current path:', location.pathname)
  }, [location.pathname])

  const shouldUseTradeRates = useMemo(() => {
    const pathname = location.pathname

    const isTradeBase = pathname === '/trade' || pathname === '/trade/'

    const isAssetSpecificPath =
      pathname.startsWith('/trade/') &&
      !pathname.includes(`/${TradeRoutePaths.Confirm}`) &&
      !pathname.includes(`/${TradeRoutePaths.VerifyAddresses}`) &&
      !pathname.includes(`/${TradeRoutePaths.QuoteList}`)

    return isTradeBase || isAssetSpecificPath
  }, [location.pathname])

  // Check if we're on a specific route
  const isOnConfirmRoute =
    location.pathname.endsWith('/confirm') || location.pathname === '/trade/confirm'
  const isOnVerifyAddressesRoute =
    location.pathname.endsWith('/verify-addresses') ||
    location.pathname === '/trade/verify-addresses'
  const isOnQuoteListRoute =
    location.pathname.endsWith('/quote-list') || location.pathname === '/trade/quote-list'

  return (
    <>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          {isOnConfirmRoute ? (
            <Route
              path='*'
              element={
                <div data-testid='trade-confirm-screen' style={{ width: '100%' }}>
                  <TradeConfirm isCompact={isCompact} />
                </div>
              }
            />
          ) : isOnVerifyAddressesRoute ? (
            <Route
              path='*'
              element={
                <div style={{ width: '100%' }}>
                  <VerifyAddresses />
                </div>
              }
            />
          ) : isOnQuoteListRoute ? (
            <Route
              path='*'
              element={
                <div style={{ width: '100%' }}>
                  <SlideTransitionRoute
                    height={tradeInputRef.current?.offsetHeight ?? '500px'}
                    width={tradeInputRef.current?.offsetWidth ?? 'full'}
                    component={QuoteList}
                    parentRoute={TradeRoutePaths.Input}
                  />
                </div>
              }
            />
          ) : (
            <>
              {/* Index route for base /trade path */}
              <Route
                index
                element={
                  <div style={{ width: '100%' }}>
                    <TradeInput
                      isCompact={isCompact}
                      tradeInputRef={tradeInputRef}
                      onChangeTab={onChangeTab}
                      isStandalone={isStandalone}
                    />
                  </div>
                }
              />
              {/* Explicit route for the TradeRoutePaths.Input value */}
              <Route
                path='*'
                element={
                  <div style={{ width: '100%' }}>
                    <TradeInput
                      isCompact={isCompact}
                      tradeInputRef={tradeInputRef}
                      onChangeTab={onChangeTab}
                      isStandalone={isStandalone}
                    />
                  </div>
                }
              />
            </>
          )}
        </Routes>
      </AnimatePresence>
      {shouldUseTradeRates ? <GetTradeRates /> : null}
    </>
  )
})
