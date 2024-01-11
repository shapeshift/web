import { AnimatePresence } from 'framer-motion'
import { Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'

import { AddLiquidityConfirm } from './AddLiquidityConfirm'
import { AddLiquidityInput } from './AddLiquidityInput'
import { AddLiquidityRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const AddLiquidityEntries = [AddLiquidityRoutePaths.Input, AddLiquidityRoutePaths.Confirm]

export const AddLiquidity = () => {
  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <AddLiquidityRoutes />
    </MemoryRouter>
  )
}

export const AddLiquidityRoutes = () => {
  const location = useLocation()

  const renderAddLiquidityInput = useCallback(() => <AddLiquidityInput />, [])
  const renderAddLiquidityConfirm = useCallback(() => <AddLiquidityConfirm />, [])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={AddLiquidityRoutePaths.Input}
            path={AddLiquidityRoutePaths.Input}
            render={renderAddLiquidityInput}
          />
          <Route
            key={AddLiquidityRoutePaths.Confirm}
            path={AddLiquidityRoutePaths.Confirm}
            render={renderAddLiquidityConfirm}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
