import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router-dom'
import type { ReduxState } from 'state/reducer'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { MultiHopTradeConfirm } from './components/MultiHopTradeConfirm/MultiHopTradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { VerifyAddresses } from './components/VerifyAddresses/VerifyAddresses'
import { TradeRoutePaths } from './types'

const MultiHopEntries = [
  TradeRoutePaths.Input,
  TradeRoutePaths.Confirm,
  TradeRoutePaths.VerifyAddresses,
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

  const routeBuyAssetCallback = useCallback(
    (state: ReduxState) => selectAssetById(state, `${chainId}/${assetSubId}`),
    [assetSubId, chainId],
  )
  const defaultBuyAssetCallback = useCallback(
    (state: ReduxState) => selectAssetById(state, defaultBuyAssetId ?? ''),
    [defaultBuyAssetId],
  )
  const routeBuyAsset = useAppSelector(routeBuyAssetCallback)
  const defaultBuyAsset = useAppSelector(defaultBuyAssetCallback)

  useEffect(() => {
    dispatch(tradeInput.actions.clear())
    if (routeBuyAsset) dispatch(tradeInput.actions.setBuyAsset(routeBuyAsset))
    else if (defaultBuyAsset) dispatch(tradeInput.actions.setBuyAsset(defaultBuyAsset))
  }, [defaultBuyAsset, defaultBuyAssetId, dispatch, routeBuyAsset])

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={MultiHopEntries} initialIndex={0}>
        <MultiHopRoutes isCompact={isCompact} />
      </MemoryRouter>
    </FormProvider>
  )
})

type MultiHopRoutesProps = {
  isCompact?: boolean
}

const MultiHopRoutes = memo(({ isCompact }: MultiHopRoutesProps) => {
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

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
          <TradeInput isCompact={isCompact} />
        </Route>
        <Route key={TradeRoutePaths.Confirm} path={TradeRoutePaths.Confirm}>
          <MultiHopTradeConfirm />
        </Route>
        <Route key={TradeRoutePaths.VerifyAddresses} path={TradeRoutePaths.VerifyAddresses}>
          <VerifyAddresses />
        </Route>
      </Switch>
    </AnimatePresence>
  )
})
