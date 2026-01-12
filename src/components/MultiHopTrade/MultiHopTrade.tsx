import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { matchPath, Route, Routes, useLocation } from 'react-router-dom'

import type { QuoteListProps } from './components/QuoteList/QuoteList'
import { QuoteList } from './components/QuoteList/QuoteList'
import { SlideTransitionRoute } from './components/SlideTransitionRoute'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { VerifyAddresses } from './components/VerifyAddresses/VerifyAddresses'
import { useGetTradeRates } from './hooks/useGetTradeQuotes/useGetTradeRates'
import type { TradeInputTab } from './types'
import { TradeRoutePaths } from './types'

import { fromBaseUnit } from '@/lib/math'
import { TRADE_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type TradeCardProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
  isCompact?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

// dummy component to allow us to mount or unmount the `useGetTradeRates` hook conditionally
const GetTradeRates = () => {
  useGetTradeRates()
  return <></>
}

const verifyAddresses = <VerifyAddresses />

export const MultiHopTrade = memo(
  ({
    defaultBuyAssetId,
    defaultSellAssetId,
    isCompact,
    isStandalone,
    onChangeTab,
  }: TradeCardProps) => {
    const dispatch = useAppDispatch()
    const location = useLocation()

    // Extract params directly from location.pathname using matchPath instead of useParams()
    // Somehow, the route below is overriden by /:chainId/:assetSubId/:nftId, so the wrong pattern matching would be used with useParams()
    // There is probably a nicer way to make this work by removing assetIdPaths from trade routes in RoutesCommon,
    // and ensure that other consumers are correctly prefixed with their own route, but spent way too many hours on this and this works for now
    const match = matchPath({ path: TRADE_ROUTE_ASSET_SPECIFIC, end: true }, location.pathname)

    const params = match?.params
    const chainId = params?.chainId
    const assetSubId = params?.assetSubId
    const sellChainId = params?.sellChainId
    const sellAssetSubId = params?.sellAssetSubId
    const paramsSellAmountCryptoBaseUnit = params?.sellAmountCryptoBaseUnit

    const [isInitialized, setIsInitialized] = useState(false)

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

    const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId))
    const buyAsset = useAppSelector(state => selectAssetById(state, buyAssetId))

    // Sync store with queryParams - we *do* use URL as source of truth at input time, but should always re-sync the store from these
    // since we'll need them later on (and the store uses buy/sell Assets vs. AssetIds)
    useEffect(() => {
      // Absolutely needed or else we'll end up in a loop
      if (isInitialized) return

      if (buyAsset) {
        dispatch(tradeInput.actions.setBuyAsset(buyAsset))
      }

      if (sellAsset) {
        dispatch(tradeInput.actions.setSellAsset(sellAsset))
      }

      if (paramsSellAmountCryptoBaseUnit && sellAsset) {
        dispatch(
          tradeInput.actions.setSellAmountCryptoPrecision(
            fromBaseUnit(paramsSellAmountCryptoBaseUnit, sellAsset.precision),
          ),
        )
      }

      setIsInitialized(true)
    }, [dispatch, buyAsset, sellAsset, paramsSellAmountCryptoBaseUnit, isInitialized])

    return (
      <TradeRoutes isCompact={isCompact} onChangeTab={onChangeTab} isStandalone={isStandalone} />
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

  const tradeInputRef = useRef<HTMLDivElement | null>(null)

  const shouldUseTradeRates = useMemo(() => {
    // We want to fetch rates when the user is on the trade input or any asset-specific trade route
    // but not on confirm, verify-addresses, etc.
    const pathname = location.pathname

    const isTradeInputPath = pathname === TradeRoutePaths.Input
    // Poor man's matchPath to check if the path is an asset-specific trade route i.e if it starts with /trade
    // but is none of /trade subroutes
    const isAssetSpecificPath =
      pathname.startsWith(TradeRoutePaths.Input) &&
      !pathname.includes(TradeRoutePaths.Confirm) &&
      !pathname.includes(TradeRoutePaths.VerifyAddresses) &&
      !pathname.includes(TradeRoutePaths.QuoteList)

    return isTradeInputPath || isAssetSpecificPath
  }, [location.pathname])

  const wrappedQuoteList = useCallback(
    (props: QuoteListProps) => (
      <QuoteList {...props} showQuoteRefreshCountdown={shouldUseTradeRates} />
    ),
    [shouldUseTradeRates],
  )

  const tradeConfirm = useMemo(() => <TradeConfirm isCompact={isCompact} />, [isCompact])
  const quoteListElement = useMemo(
    () => (
      <SlideTransitionRoute
        height={tradeInputRef.current?.offsetHeight ?? '660px'}
        width={tradeInputRef.current?.offsetWidth ?? 'full'}
        component={wrappedQuoteList}
        parentRoute={TradeRoutePaths.Input}
      />
    ),
    [wrappedQuoteList],
  )

  const tradeInputElement = useMemo(
    () => (
      <TradeInput
        isCompact={isCompact}
        tradeInputRef={tradeInputRef}
        onChangeTab={onChangeTab}
        isStandalone={isStandalone}
      />
    ),
    [isCompact, onChangeTab, isStandalone],
  )

  return (
    <>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route key={TradeRoutePaths.Confirm} path={'confirm'} element={tradeConfirm} />
          <Route
            key={TradeRoutePaths.VerifyAddresses}
            path={TradeRoutePaths.VerifyAddresses}
            element={verifyAddresses}
          />
          <Route
            key={TradeRoutePaths.QuoteList}
            path={TradeRoutePaths.QuoteList}
            element={quoteListElement}
          />
          <Route key={TradeRoutePaths.Input} path={'*'} element={tradeInputElement} />
          <Route path='/trade/*' element={tradeInputElement} />
        </Routes>
      </AnimatePresence>
      {/* Stop polling for quotes by unmounting the hook. This prevents trade execution getting */}
      {/* corrupted from state being mutated during trade execution. */}
      {/* TODO: move the hook into a react-query or similar and pass a flag  */}
      {shouldUseTradeRates ? <GetTradeRates /> : null}
    </>
  )
})
