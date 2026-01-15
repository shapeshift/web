import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { QuoteListProps } from './components/QuoteList/QuoteList'
import { QuoteList } from './components/QuoteList/QuoteList'
import { SlideTransitionRoute } from './components/SlideTransitionRoute'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { VerifyAddresses } from './components/VerifyAddresses/VerifyAddresses'
import { useGetTradeRates } from './hooks/useGetTradeQuotes/useGetTradeRates'
import type { TradeCardProps } from './MultiHopTrade'
import type { TradeInputTab } from './types'
import { TradeRoutePaths } from './types'

import { fromBaseUnit } from '@/lib/math'
import { TRADE_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type StandaloneTradeCardProps = TradeCardProps

const GetTradeRates = () => {
  useGetTradeRates()
  return <></>
}

export const StandaloneMultiHopTrade = memo(
  ({
    defaultBuyAssetId,
    defaultSellAssetId,
    isCompact,
    onChangeTab,
    isStandalone,
  }: StandaloneTradeCardProps) => {
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

    const sellAsset = useAppSelector(selectInputSellAsset)
    const buyAsset = useAppSelector(selectInputBuyAsset)
    const navigate = useNavigate()
    const sellInputAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isInitialMount, setIsInitialMount] = useState(true)

    useEffect(() => {
      if (!isInitialMount || isStandalone) return

      dispatch(tradeInput.actions.clear())

      setIsInitialMount(false)
    }, [dispatch, isStandalone, isInitialMount, navigate, buyAsset.assetId, sellAsset.assetId])

    useEffect(() => {
      if (isStandalone || isInitialMount) return

      const sellAmountBaseUnit =
        sellInputAmountCryptoBaseUnit ?? paramsSellAmountCryptoBaseUnit ?? ''
      navigate(`/trade/${buyAsset.assetId}/${sellAsset.assetId}/${sellAmountBaseUnit ?? ''}`)
    }, [
      isInitialMount,
      isStandalone,
      buyAsset,
      sellAsset,
      navigate,
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
      <StandaloneTradeRoutes
        isCompact={isCompact}
        onChangeTab={onChangeTab}
        isStandalone={isStandalone}
      />
    )
  },
)

type StandaloneTradeRoutesProps = {
  isCompact?: boolean
  isStandalone?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

const StandaloneTradeRoutes = memo(
  ({ isCompact, isStandalone, onChangeTab }: StandaloneTradeRoutesProps) => {
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

    // Create memoized elements for each route
    const tradeConfirmElement = useMemo(() => <TradeConfirm isCompact={isCompact} />, [isCompact])

    const verifyAddressesElement = useMemo(() => <VerifyAddresses />, [])

    const wrappedQuoteList = useCallback(
      (props: QuoteListProps) => (
        <QuoteList {...props} showQuoteRefreshCountdown={shouldUseTradeRates} />
      ),
      [shouldUseTradeRates],
    )

    const quoteListElement = useMemo(
      () => (
        <SlideTransitionRoute
          height={tradeInputRef.current?.offsetHeight ?? '660px'}
          width={tradeInputRef.current?.offsetWidth ?? 'full'}
          component={wrappedQuoteList}
          parentRoute={TradeRoutePaths.Input}
        />
      ),
      [tradeInputRef, wrappedQuoteList],
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
          <Switch location={location.pathname}>
            <Route key={`/trade/${TradeRoutePaths.Input}`} path={`/trade/${TradeRoutePaths.Input}`}>
              {tradeInputElement}
            </Route>
            <Route
              key={`/trade/${TradeRoutePaths.Confirm}`}
              path={`/trade/${TradeRoutePaths.Confirm}`}
            >
              {tradeConfirmElement}
            </Route>
            <Route
              key={`/trade/${TradeRoutePaths.VerifyAddresses}`}
              path={`/trade/${TradeRoutePaths.VerifyAddresses}`}
            >
              {verifyAddressesElement}
            </Route>
            <Route
              key={`/trade/${TradeRoutePaths.QuoteList}`}
              path={`/trade/${TradeRoutePaths.QuoteList}`}
            >
              {quoteListElement}
            </Route>
            <Route path='*'>{tradeInputElement}</Route>
          </Switch>
        </AnimatePresence>
        {/* Stop polling for quotes by unmounting the hook. This prevents trade execution getting */}
        {/* corrupted from state being mutated during trade execution. */}
        {/* TODO: move the hook into a react-query or similar and pass a flag  */}
        {shouldUseTradeRates ? <GetTradeRates /> : null}
      </>
    )
  },
)
