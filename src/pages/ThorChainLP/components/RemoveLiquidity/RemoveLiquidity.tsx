import { AnimatePresence } from 'framer-motion'
import React, { Suspense, useCallback } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'

import { RemoveLiquidityConfirm } from './RemoveLiquidityConfirm'
import { RemoveLiquidityInput } from './RemoveLiquidityInput'
import { RemoveLiquidityStatus } from './RemoveLiquidityStatus'
import { RemoveLiquidityRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const AddLiquidityEntries = [
  RemoveLiquidityRoutePaths.Input,
  RemoveLiquidityRoutePaths.Confirm,
  RemoveLiquidityRoutePaths.Status,
]

export type RemoveLiquidityProps = {
  headerComponent?: JSX.Element
}
export const RemoveLiquidity: React.FC<RemoveLiquidityProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <RemoveLiquidityRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

const RemoveLiquidityRoutes: React.FC<RemoveLiquidityProps> = ({ headerComponent }) => {
  const location = useLocation()
  const renderRemoveLiquidityInput = useCallback(
    () => <RemoveLiquidityInput headerComponent={headerComponent} />,
    [headerComponent],
  )
  const renderRemoveLiquidityConfirm = useCallback(() => <RemoveLiquidityConfirm />, [])
  const renderRemoveLiquidityStatus = useCallback(() => <RemoveLiquidityStatus />, [])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={RemoveLiquidityRoutePaths.Input}
            path={RemoveLiquidityRoutePaths.Input}
            render={renderRemoveLiquidityInput}
          />
          <Route
            key={RemoveLiquidityRoutePaths.Confirm}
            path={RemoveLiquidityRoutePaths.Confirm}
            render={renderRemoveLiquidityConfirm}
          />
          <Route
            key={RemoveLiquidityRoutePaths.Status}
            path={RemoveLiquidityRoutePaths.Status}
            render={renderRemoveLiquidityStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
