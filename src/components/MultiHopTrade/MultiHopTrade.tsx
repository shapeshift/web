import type { AssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useHistory, useLocation, useParams } from 'react-router-dom'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { LimitOrder } from './components/LimitOrder/LimitOrder'
import { MultiHopTradeConfirm } from './components/MultiHopTradeConfirm/MultiHopTradeConfirm'
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
  isCompact?: boolean
}

type MatchParams = {
  chainId?: string
  assetSubId?: string
}

// dummy component to allow us to mount or unmount the `useGetTradeRates` hook conditionally
const GetTradeRates = () => {
  useGetTradeRates()
  return <></>
}

export const MultiHopTrade = memo(({ defaultBuyAssetId, isCompact }: TradeCardProps) => {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const methods = useForm({ mode: 'onChange' })
  const { assetSubId, chainId } = useParams<MatchParams>()
  const [initialIndex, setInitialIndex] = useState<number | undefined>()

  const routeBuyAsset = useAppSelector(state => selectAssetById(state, `${chainId}/${assetSubId}`))
  const defaultBuyAsset = useAppSelector(state => selectAssetById(state, defaultBuyAssetId ?? ''))

  // Handle deep linked route from other pages
  useEffect(() => {
    if (initialIndex !== undefined) return
    const incomingIndex = TradeRouteEntries.indexOf(location.pathname as TradeRoutePaths)
    setInitialIndex(incomingIndex === -1 ? 0 : incomingIndex)
  }, [initialIndex, location])

  useEffect(() => {
    dispatch(tradeInput.actions.clear())

    if (
      routeBuyAsset?.chainId === KnownChainIds.SolanaMainnet ||
      defaultBuyAsset?.chainId === KnownChainIds.SolanaMainnet
    ) {
      return
    }

    if (routeBuyAsset) {
      dispatch(tradeInput.actions.setBuyAsset(routeBuyAsset))
    } else if (defaultBuyAsset) {
      dispatch(tradeInput.actions.setBuyAsset(defaultBuyAsset))
    }
  }, [defaultBuyAsset, defaultBuyAssetId, dispatch, routeBuyAsset])

  // Prevent default behavior overriding deep linked route
  if (initialIndex === undefined) return null

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={TradeRouteEntries} initialIndex={initialIndex}>
        <TradeRoutes isCompact={isCompact} />
      </MemoryRouter>
    </FormProvider>
  )
})

type TradeRoutesProps = {
  isCompact?: boolean
}

const TradeRoutes = memo(({ isCompact }: TradeRoutesProps) => {
  const history = useHistory()
  const location = useLocation()
  const isNewTradeFlowEnabled = useFeatureFlag('NewTradeFlow')

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
            {isNewTradeFlowEnabled ? <TradeConfirm /> : <MultiHopTradeConfirm />}
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
