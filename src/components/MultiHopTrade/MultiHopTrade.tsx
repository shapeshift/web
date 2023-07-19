import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch } from 'state/store'

import { Approval } from './components/Approval/Approval'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { TradeInput } from './components/TradeInput/TradeInput'
import { TradeRoutePaths } from './types'

const MultiHopEntries = [TradeRoutePaths.Input, TradeRoutePaths.Approval, TradeRoutePaths.Confirm]

export const MultiHopTrade = ({ ...cardProps }: CardProps) => {
  const methods = useForm({ mode: 'onChange' })

  return (
    <Card {...cardProps}>
      <Card.Body py={6}>
        <FormProvider {...methods}>
          <MemoryRouter initialEntries={MultiHopEntries} initialIndex={0}>
            <MultiHopRoutes />
          </MemoryRouter>
        </FormProvider>
      </Card.Body>
    </Card>
  )
}

const MultiHopRoutes = () => {
  const location = useLocation()
  const dispatch = useAppDispatch()

  useEffect(() => {
    return () => {
      // Reset the swapper slice to initial state on mount
      // Don't move me to one of the trade route components, this needs to be at router-level
      // We only want to clear swapper state when trade components are fully unmounted, not when trade routes change
      dispatch(swappers.actions.clear())
    }
  }, [dispatch])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
          <TradeInput />
        </Route>
        <Route key={TradeRoutePaths.Confirm} path={TradeRoutePaths.Confirm}>
          <TradeConfirm />
        </Route>
        <Route key={TradeRoutePaths.Approval} path={TradeRoutePaths.Approval}>
          <Approval />
        </Route>
      </Switch>
    </AnimatePresence>
  )
}
