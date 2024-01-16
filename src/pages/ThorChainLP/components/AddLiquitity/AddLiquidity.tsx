import { AnimatePresence } from 'framer-motion'
import React, { Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'

import { AddLiquidityConfirm } from './AddLiquidityConfirm'
import { AddLiquidityInput } from './AddLiquidityInput'
import { AddLiquidityStatus } from './AddLiquityStatus'
import { AddLiquidityRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const AddLiquidityEntries = [
  AddLiquidityRoutePaths.Input,
  AddLiquidityRoutePaths.Confirm,
  AddLiquidityRoutePaths.Status,
]

export type AddLiquidityProps = {
  headerComponent?: JSX.Element
}

export const AddLiquidity: React.FC<AddLiquidityProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <AddLiquidityRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const AddLiquidityRoutes: React.FC<AddLiquidityProps> = ({ headerComponent }) => {
  const location = useLocation()

  const renderAddLiquidityInput = useCallback(
    () => <AddLiquidityInput headerComponent={headerComponent} />,
    [headerComponent],
  )
  const renderAddLiquidityConfirm = useCallback(() => <AddLiquidityConfirm />, [])

  const renderAddLiquidityStatus = useCallback(() => <AddLiquidityStatus />, [])

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
          <Route
            key={AddLiquidityRoutePaths.Status}
            path={AddLiquidityRoutePaths.Status}
            render={renderAddLiquidityStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
