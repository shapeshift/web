import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router-dom'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { TradeRoutePaths } from './types'

const Approval = lazy(() =>
  import('./components/Approval/Approval').then(({ Approval }) => ({ default: Approval })),
)
const MultiHopTradeConfirm = lazy(() =>
  import('./components/MultiHopTradeConfirm/MultiHopTradeConfirm').then(
    ({ MultiHopTradeConfirm }) => ({
      default: MultiHopTradeConfirm,
    }),
  ),
)

const TradeConfirm = lazy(() =>
  import('./components/TradeConfirm/TradeConfirm').then(({ TradeConfirm }) => ({
    default: TradeConfirm,
  })),
)

const TradeInput = lazy(() =>
  import('./components/TradeInput/TradeInput').then(({ TradeInput }) => ({ default: TradeInput })),
)
const VerifyAddresses = lazy(() =>
  import('./components/VerifyAddresses/VerifyAddresses').then(({ VerifyAddresses }) => ({
    default: VerifyAddresses,
  })),
)

const MultiHopEntries = [
  TradeRoutePaths.Input,
  TradeRoutePaths.Approval,
  TradeRoutePaths.Confirm,
  TradeRoutePaths.VerifyAddresses,
]

export type TradeCardProps = {
  defaultBuyAssetId?: AssetId
} & CardProps

type MatchParams = {
  chainId?: string
  assetSubId?: string
}

export const MultiHopTrade = memo(({ defaultBuyAssetId, ...cardProps }: TradeCardProps) => {
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
    <Card {...cardProps}>
      <CardBody px={0} py={0}>
        <FormProvider {...methods}>
          <MemoryRouter initialEntries={MultiHopEntries} initialIndex={0}>
            <MultiHopRoutes />
          </MemoryRouter>
        </FormProvider>
      </CardBody>
    </Card>
  )
})

const MultiHopRoutes = memo(() => {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const enableMultiHopTrades = useFeatureFlag('MultiHopTrades')

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
    <Suspense>
      <AnimatePresence mode='wait' initial={false}>
        <Switch location={location}>
          <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
            <TradeInput />
          </Route>
          <Route key={TradeRoutePaths.Confirm} path={TradeRoutePaths.Confirm}>
            {enableMultiHopTrades ? <MultiHopTradeConfirm /> : <TradeConfirm />}
          </Route>
          <Route key={TradeRoutePaths.Approval} path={TradeRoutePaths.Approval}>
            <Approval />
          </Route>
          <Route key={TradeRoutePaths.VerifyAddresses} path={TradeRoutePaths.VerifyAddresses}>
            <VerifyAddresses />
          </Route>
        </Switch>
      </AnimatePresence>
    </Suspense>
  )
})
