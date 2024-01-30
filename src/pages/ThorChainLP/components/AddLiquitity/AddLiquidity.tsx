import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import type { LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'

import { AddLiquidityConfirm } from './AddLiquidityConfirm'
import { AddLiquidityInput } from './AddLiquidityInput'
import { AddLiquiditySweep } from './AddLiquiditySweep'
import { AddLiquidityStatus } from './AddLiquityStatus'
import { AddLiquidityRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const AddLiquidityEntries = [
  AddLiquidityRoutePaths.Input,
  AddLiquidityRoutePaths.Confirm,
  AddLiquidityRoutePaths.Status,
  AddLiquidityRoutePaths.Sweep,
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
  const [confirmedQuote, setConfirmedQuote] = useState<LpConfirmedDepositQuote | null>(null)

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
  confirmedQuote: LpConfirmedDepositQuote | null
  setConfirmedQuote: (quote: LpConfirmedDepositQuote) => void
}

export const AddLiquidityRoutes: React.FC<AddLiquidityRoutesProps> = ({
  headerComponent,
  opportunityId,
  paramOpportunityId,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const history = useHistory()
  const location = useLocation()
  const [accountIdsByChainId, setAccountIdsByChainId] = useState<Record<ChainId, AccountId>>({})

  const onAccountIdChange = useCallback(
    (accountId: AccountId) => {
      setAccountIdsByChainId(prev => {
        const chainId = fromAccountId(accountId).chainId
        return { ...prev, [chainId]: accountId }
      })
    },
    [setAccountIdsByChainId],
  )

  const renderAddLiquidityInput = useCallback(
    () => (
      <AddLiquidityInput
        opportunityId={opportunityId}
        paramOpportunityId={paramOpportunityId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
        accountIdsByChainId={accountIdsByChainId}
        onAccountIdChange={onAccountIdChange}
      />
    ),
    [
      accountIdsByChainId,
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

  const renderAddLiquiditySweep = useCallback(
    () =>
      confirmedQuote ? (
        <AddLiquiditySweep
          confirmedQuote={confirmedQuote}
          // eslint-disable-next-line react-memo/require-usememo
          onSweepSeen={() => {
            history.push(AddLiquidityRoutePaths.Confirm)
          }}
          // eslint-disable-next-line react-memo/require-usememo
          onBack={() => {
            history.push(AddLiquidityRoutePaths.Input)
          }}
        />
      ) : null,
    [confirmedQuote, history],
  )

  return (
    <AnimatePresence mode='wait' initial={false}>
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
          <Route
            key={AddLiquidityRoutePaths.Sweep}
            path={AddLiquidityRoutePaths.Sweep}
            render={renderAddLiquiditySweep}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
