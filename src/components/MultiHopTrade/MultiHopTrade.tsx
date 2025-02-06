import type { AssetId } from '@shapeshiftoss/caip'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useHistory, useLocation, useParams } from 'react-router-dom'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAsset,
} from 'state/slices/tradeInputSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { LimitOrder } from './components/LimitOrder/LimitOrder'
import { QuoteList } from './components/QuoteList/QuoteList'
import { SlideTransitionRoute } from './components/SlideTransitionRoute'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { Claim } from './components/TradeInput/components/Claim/Claim'
import { TradeInput } from './components/TradeInput/TradeInput'
import { VerifyAddresses } from './components/VerifyAddresses/VerifyAddresses'
import { useGetTradeRates } from './hooks/useGetTradeQuotes/useGetTradeRates'
import { TradeInputTab, TradeRoutePaths } from './types'

const TradeRouteEntries = [
  TradeRoutePaths.Input,
  TradeRoutePaths.Confirm,
  TradeRoutePaths.VerifyAddresses,
  TradeRoutePaths.QuoteList,
  TradeRoutePaths.Claim,
  TradeRoutePaths.LimitOrder,
]

export type TradeCardProps = {
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
  isCompact?: boolean
  isRewritingUrl?: boolean
}

type MatchParams = {
  chainId?: string
  assetSubId?: string
  sellAssetSubId?: string
  sellChainId?: string
  sellAmountCryptoBaseUnit?: string
}

// dummy component to allow us to mount or unmount the `useGetTradeRates` hook conditionally
const GetTradeRates = () => {
  useGetTradeRates()
  return <></>
}

export const MultiHopTrade = memo(
  ({ defaultBuyAssetId, defaultSellAssetId, isCompact, isRewritingUrl }: TradeCardProps) => {
    const location = useLocation()
    const dispatch = useAppDispatch()
    const methods = useForm({ mode: 'onChange' })
    const { assetSubId, chainId, sellAssetSubId, sellChainId, sellAmountCryptoBaseUnit } =
      useParams<MatchParams>()
    const [initialIndex, setInitialIndex] = useState<number | undefined>()
    const sellAsset = useAppSelector(selectInputSellAsset)
    const buyAsset = useAppSelector(selectInputBuyAsset)
    const history = useHistory()
    const sellInputAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
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

    const routeSellAsset = useAppSelector(state => selectAssetById(state, sellAssetId))

    const routeBuyAsset = useAppSelector(state => selectAssetById(state, buyAssetId))

    // Handle deep linked route from other pages
    useEffect(() => {
      if (initialIndex !== undefined) return
      const incomingIndex = TradeRouteEntries.indexOf(location.pathname as TradeRoutePaths)
      setInitialIndex(incomingIndex === -1 ? 0 : incomingIndex)
    }, [initialIndex, location])

    useEffect(() => {
      // Absolutely needed or else we'll end up in a loop
      if (isInitialized) return

      if (routeBuyAsset) {
        dispatch(tradeInput.actions.setBuyAsset(routeBuyAsset))
      }

      if (routeSellAsset) {
        dispatch(tradeInput.actions.setSellAsset(routeSellAsset))
      }

      if (sellAmountCryptoBaseUnit && routeSellAsset) {
        dispatch(
          tradeInput.actions.setSellAmountCryptoPrecision(
            fromBaseUnit(sellAmountCryptoBaseUnit, routeSellAsset.precision),
          ),
        )
      }

      setIsInitialized(true)
    }, [dispatch, routeBuyAsset, routeSellAsset, sellAmountCryptoBaseUnit, isInitialized])

    useEffect(() => {
      if (isRewritingUrl) {
        const sellAmountBaseUnit = sellInputAmountCryptoBaseUnit ?? sellAmountCryptoBaseUnit ?? ''

        history.push(`/trade/${buyAsset.assetId}/${sellAsset.assetId}/${sellAmountBaseUnit ?? ''}`)
      }
    }, [
      isInitialized,
      isRewritingUrl,
      buyAsset,
      sellAsset,
      routeBuyAsset?.assetId,
      routeSellAsset?.assetId,
      sellAmountCryptoBaseUnit,
      history,
      sellInputAmountCryptoBaseUnit,
      routeBuyAsset,
      routeSellAsset,
    ])

    useEffect(() => {
      return () => {
        dispatch(tradeInput.actions.clear())
      }
    }, [dispatch])

    // Prevent default behavior overriding deep linked route
    if (initialIndex === undefined) return null

    return (
      <FormProvider {...methods}>
        <MemoryRouter initialEntries={TradeRouteEntries} initialIndex={initialIndex}>
          <TradeRoutes isCompact={isCompact} />
        </MemoryRouter>
      </FormProvider>
    )
  },
)

type TradeRoutesProps = {
  isCompact?: boolean
}

const TradeRoutes = memo(({ isCompact }: TradeRoutesProps) => {
  const history = useHistory()
  const location = useLocation()

  const tradeInputRef = useRef<HTMLDivElement | null>(null)

  const shouldUseTradeRates = useMemo(() => {
    // We only want to fetch rates when the user is on the trade input or quote list route
    return [TradeRoutePaths.Input, TradeRoutePaths.QuoteList].includes(
      location.pathname as TradeRoutePaths,
    )
  }, [location.pathname])

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(TradeRoutePaths.LimitOrder)
          break
        case TradeInputTab.Claim:
          history.push(TradeRoutePaths.Claim)
          break
        default:
          assertUnreachable(newTab)
      }
    },
    [history],
  )

  return (
    <>
      <AnimatePresence mode='wait' initial={false}>
        <Switch location={location}>
          <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
            <TradeInput
              isCompact={isCompact}
              tradeInputRef={tradeInputRef}
              onChangeTab={handleChangeTab}
            />
          </Route>
          <Route key={TradeRoutePaths.Confirm} path={TradeRoutePaths.Confirm}>
            <TradeConfirm />
          </Route>
          <Route key={TradeRoutePaths.VerifyAddresses} path={TradeRoutePaths.VerifyAddresses}>
            <VerifyAddresses />
          </Route>
          <Route key={TradeRoutePaths.QuoteList} path={TradeRoutePaths.QuoteList}>
            <SlideTransitionRoute
              height={tradeInputRef.current?.offsetHeight ?? '500px'}
              width={tradeInputRef.current?.offsetWidth ?? 'full'}
              component={QuoteList}
              parentRoute={TradeRoutePaths.Input}
            />
          </Route>
          <Route key={TradeRoutePaths.Claim} path={TradeRoutePaths.Claim}>
            <Claim onChangeTab={handleChangeTab} />
          </Route>
          <Route key={TradeRoutePaths.LimitOrder} path={TradeRoutePaths.LimitOrder}>
            <LimitOrder
              isCompact={isCompact}
              tradeInputRef={tradeInputRef}
              onChangeTab={handleChangeTab}
            />
          </Route>
        </Switch>
      </AnimatePresence>
      {/* Stop polling for quotes by unmounting the hook. This prevents trade execution getting */}
      {/* corrupted from state being mutated during trade execution. */}
      {/* TODO: move the hook into a react-query or similar and pass a flag  */}
      {shouldUseTradeRates ? <GetTradeRates /> : null}
    </>
  )
})
