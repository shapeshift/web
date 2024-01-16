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
  opportunityId?: string
}

export const AddLiquidity: React.FC<AddLiquidityProps> = ({ opportunityId, headerComponent }) => {
  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <AddLiquidityRoutes opportunityId={opportunityId} headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const AddLiquidityRoutes: React.FC<AddLiquidityProps> = ({
  headerComponent,
  opportunityId,
}) => {
  const location = useLocation()

  const renderAddLiquidityInput = useCallback(
    () => <AddLiquidityInput opportunityId={opportunityId} headerComponent={headerComponent} />,
    [headerComponent, opportunityId],
  )
  const renderAddLiquidityConfirm = useCallback(
    () => <AddLiquidityConfirm opportunityId={opportunityId} />,
    [opportunityId],
  )

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
