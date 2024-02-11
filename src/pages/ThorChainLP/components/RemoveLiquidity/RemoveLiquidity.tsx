import { type AccountId, type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import type { LpConfirmedWithdrawalQuote } from 'lib/utils/thorchain/lp/types'

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
  headerComponent: JSX.Element
  opportunityId: string
}

export type RemoveLiquidityRoutesProps = RemoveLiquidityProps & {
  confirmedQuote: LpConfirmedWithdrawalQuote | null
  setConfirmedQuote: (quote: LpConfirmedWithdrawalQuote) => void
}

export const RemoveLiquidity: React.FC<RemoveLiquidityProps> = ({
  headerComponent,
  opportunityId,
}) => {
  const [confirmedQuote, setConfirmedQuote] = useState<LpConfirmedWithdrawalQuote | null>(null)

  return (
    <MemoryRouter initialEntries={AddLiquidityEntries} initialIndex={0}>
      <RemoveLiquidityRoutes
        headerComponent={headerComponent}
        opportunityId={opportunityId}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
      />
    </MemoryRouter>
  )
}

const RemoveLiquidityRoutes: React.FC<RemoveLiquidityRoutesProps> = ({
  headerComponent,
  opportunityId,
  confirmedQuote,
  setConfirmedQuote,
}) => {
  const location = useLocation()

  const [accountIdsByChainId, setAccountIdsByChainId] = useState<Record<ChainId, AccountId>>({})

  // fixme
  const _onAccountIdChange = useCallback(
    (accountId: AccountId) => {
      setAccountIdsByChainId(prev => {
        const chainId = fromAccountId(accountId).chainId
        return { ...prev, [chainId]: accountId }
      })
    },
    [setAccountIdsByChainId],
  )

  const renderRemoveLiquidityInput = useCallback(
    () => (
      <RemoveLiquidityInput
        headerComponent={headerComponent}
        opportunityId={opportunityId}
        confirmedQuote={confirmedQuote}
        setConfirmedQuote={setConfirmedQuote}
        accountIdsByChainId={accountIdsByChainId}
      />
    ),
    [accountIdsByChainId, confirmedQuote, headerComponent, opportunityId, setConfirmedQuote],
  )
  const renderRemoveLiquidityConfirm = useCallback(() => <RemoveLiquidityConfirm />, [])
  const renderRemoveLiquidityStatus = useCallback(() => <RemoveLiquidityStatus />, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
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
