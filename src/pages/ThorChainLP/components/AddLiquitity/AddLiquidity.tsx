import { AnimatePresence } from 'framer-motion'
import React, { Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import type { ConfirmedQuote } from 'lib/utils/thorchain/lp/types'

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
  const [confirmedQuote, setConfirmedQuote] = useState<ConfirmedQuote | null>(null)

  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <AddLiquidityRoutes
        opportunityId={opportunityId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
      />
    </MemoryRouter>
  )
}

type AddLiquidityRoutesProps = AddLiquidityProps & {
  confirmedQuote: ConfirmedQuote | null
  setConfirmedQuote: (quote: ConfirmedQuote) => void
}

export const AddLiquidityRoutes: React.FC<AddLiquidityRoutesProps> = ({
  headerComponent,
  opportunityId,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const location = useLocation()

  const renderAddLiquidityInput = useCallback(
    () => (
      <AddLiquidityInput
        opportunityId={opportunityId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
      />
    ),
    [confirmedQuote, headerComponent, opportunityId, setConfirmedQuote],
  )
  const renderAddLiquidityConfirm = useCallback(
    () =>
      confirmedQuote ? (
        <AddLiquidityConfirm opportunityId={opportunityId} confirmedQuote={confirmedQuote} />
      ) : null,
    [confirmedQuote, opportunityId],
  )

  const renderAddLiquidityStatus = useCallback(
    () =>
      confirmedQuote ? (
        <AddLiquidityStatus opportunityId={opportunityId} confirmedQuote={confirmedQuote} />
      ) : null,
    [confirmedQuote, opportunityId],
  )

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
