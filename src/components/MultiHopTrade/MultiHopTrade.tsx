import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useEffect, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router-dom'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { MultiHopTradeConfirm } from './components/MultiHopTradeConfirm/MultiHopTradeConfirm'
import { QuoteListRoute } from './components/QuoteList/QuoteListRoute'
import { TradeInput } from './components/TradeInput/TradeInput'
import { VerifyAddresses } from './components/VerifyAddresses/VerifyAddresses'
import { TradeRoutePaths } from './types'

const TradeRouteEntries = [
  TradeRoutePaths.Input,
  TradeRoutePaths.Confirm,
  TradeRoutePaths.VerifyAddresses,
  TradeRoutePaths.QuoteList,
]

export type TradeCardProps = {
  defaultBuyAssetId?: AssetId
  isCompact?: boolean
}

type MatchParams = {
  chainId?: string
  assetSubId?: string
}

export const MultiHopTrade = memo(({ defaultBuyAssetId, isCompact }: TradeCardProps) => {
  const dispatch = useAppDispatch()
  const methods = useForm({ mode: 'onChange' })
  const { assetSubId, chainId } = useParams<MatchParams>()

  const routeBuyAsset = useAppSelector(state => selectAssetById(state, `${chainId}/${assetSubId}`))
  const defaultBuyAsset = useAppSelector(state => selectAssetById(state, defaultBuyAssetId ?? ''))

  useEffect(() => {
    dispatch(tradeInput.actions.clear())
    if (routeBuyAsset) dispatch(tradeInput.actions.setBuyAsset(routeBuyAsset))
    else if (defaultBuyAsset) dispatch(tradeInput.actions.setBuyAsset(defaultBuyAsset))
  }, [defaultBuyAsset, defaultBuyAssetId, dispatch, routeBuyAsset])

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={TradeRouteEntries} initialIndex={0}>
        <TradeRoutes isCompact={isCompact} />
      </MemoryRouter>
    </FormProvider>
  )
})

type TradeRoutesProps = {
  isCompact?: boolean
}

const TradeRoutes = memo(({ isCompact }: TradeRoutesProps) => {
  const location = useLocation()
  const dispatch = useAppDispatch()

  useEffect(() => {
    return () => {
      // Reset the trade slices to initial state on unmount
      // Don't move me to one of the trade route components, this needs to be at router-level
      // We only want to clear swapper state when trade components are fully unmounted, not when trade routes change
      dispatch(tradeInput.actions.clear())
      dispatch(tradeQuoteSlice.actions.clear())
    }
  }, [dispatch])

  const tradeInputRef = useRef<HTMLDivElement | null>(null)

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
          <TradeInput isCompact={isCompact} tradeInputRef={tradeInputRef} />
        </Route>
        <Route key={TradeRoutePaths.Confirm} path={TradeRoutePaths.Confirm}>
          <MultiHopTradeConfirm />
        </Route>
        <Route key={TradeRoutePaths.VerifyAddresses} path={TradeRoutePaths.VerifyAddresses}>
          <VerifyAddresses />
        </Route>
        <Route key={TradeRoutePaths.QuoteList} path={TradeRoutePaths.QuoteList}>
          <QuoteListRoute
            height={tradeInputRef.current?.offsetHeight ?? '500px'}
            width={tradeInputRef.current?.offsetWidth ?? 'full'}
          />
        </Route>
      </Switch>
    </AnimatePresence>
  )
})
