import type { AccountId, AssetId } from '@shapeshiftoss/caip'
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
  paramOpportunityId?: string
}

export const AddLiquidity: React.FC<AddLiquidityProps> = ({
  opportunityId,
  headerComponent,
  paramOpportunityId,
}) => {
  const [confirmedQuote, setConfirmedQuote] = useState<ConfirmedQuote | null>(null)

  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <AddLiquidityRoutes
        opportunityId={opportunityId}
        paramOpportunityId={paramOpportunityId}
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
  paramOpportunityId,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const location = useLocation()
  const [accountIds, setAccountIds] = useState<Record<AssetId, AccountId>>({})

  const onAccountIdChange = useCallback(
    (accountId: AccountId, assetId: AssetId) => {
      setAccountIds(prev => ({ ...prev, [assetId]: accountId }))
    },
    [setAccountIds],
  )

  const renderAddLiquidityInput = useCallback(
    () => (
      <AddLiquidityInput
        opportunityId={opportunityId}
        paramOpportunityId={paramOpportunityId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
        accountIds={accountIds}
        onAccountIdChange={onAccountIdChange}
      />
    ),
    [
      accountIds,
      confirmedQuote,
      headerComponent,
      onAccountIdChange,
      opportunityId,
      paramOpportunityId,
      setConfirmedQuote,
    ],
  )
  const renderAddLiquidityConfirm = useCallback(
    () => (confirmedQuote ? <AddLiquidityConfirm confirmedQuote={confirmedQuote} /> : null),
    [confirmedQuote],
  )

  const renderAddLiquidityStatus = useCallback(
    () => (confirmedQuote ? <AddLiquidityStatus confirmedQuote={confirmedQuote} /> : null),
    [confirmedQuote],
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
