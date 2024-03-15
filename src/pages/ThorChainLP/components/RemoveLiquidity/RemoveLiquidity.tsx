import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import type { LpConfirmedWithdrawalQuote } from 'lib/utils/thorchain/lp/types'

import { RemoveLiquidityRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const RemoveLiquidityConfirm = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquidityConfirm').then(({ RemoveLiquidityConfirm }) => ({
      default: RemoveLiquidityConfirm,
    })),
  ),
)

const RemoveLiquidityInput = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquidityInput').then(({ RemoveLiquidityInput }) => ({
      default: RemoveLiquidityInput,
    })),
  ),
)

const RemoveLiquidityStatus = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquidityStatus').then(({ RemoveLiquidityStatus }) => ({
      default: RemoveLiquidityStatus,
    })),
  ),
)

const RemoveLiquiditySweep = makeSuspenseful(
  lazy(() =>
    import('./RemoveLiquiditySweep').then(({ RemoveLiquiditySweep }) => ({
      default: RemoveLiquiditySweep,
    })),
  ),
)

const RemoveLiquidityEntries = [
  RemoveLiquidityRoutePaths.Input,
  RemoveLiquidityRoutePaths.Confirm,
  RemoveLiquidityRoutePaths.Status,
  RemoveLiquidityRoutePaths.Sweep,
]

export type RemoveLiquidityProps = {
  headerComponent: JSX.Element
  opportunityId: string
  accountId: AccountId
  poolAssetId: string
}

export type RemoveLiquidityRoutesProps = RemoveLiquidityProps & {
  confirmedQuote: LpConfirmedWithdrawalQuote | null
  setConfirmedQuote: (quote: LpConfirmedWithdrawalQuote) => void
}

export const RemoveLiquidity: React.FC<RemoveLiquidityProps> = ({
  headerComponent,
  opportunityId,
  accountId,
  poolAssetId,
}) => {
  const [confirmedQuote, setConfirmedQuote] = useState<LpConfirmedWithdrawalQuote | null>(null)

  return (
    <MemoryRouter initialEntries={RemoveLiquidityEntries} initialIndex={0}>
      <RemoveLiquidityRoutes
        headerComponent={headerComponent}
        opportunityId={opportunityId}
        setConfirmedQuote={setConfirmedQuote}
        confirmedQuote={confirmedQuote}
        accountId={accountId}
        poolAssetId={poolAssetId}
      />
    </MemoryRouter>
  )
}

const RemoveLiquidityRoutes: React.FC<RemoveLiquidityRoutesProps> = ({
  headerComponent,
  opportunityId,
  confirmedQuote,
  setConfirmedQuote,
  accountId,
  poolAssetId,
}) => {
  const history = useHistory()
  const location = useLocation()
  const renderRemoveLiquidityInput = useCallback(
    () => (
      <RemoveLiquidityInput
        headerComponent={headerComponent}
        opportunityId={opportunityId}
        confirmedQuote={confirmedQuote}
        setConfirmedQuote={setConfirmedQuote}
        accountId={accountId}
        poolAssetId={poolAssetId}
      />
    ),
    [confirmedQuote, headerComponent, opportunityId, accountId, setConfirmedQuote, poolAssetId],
  )
  const renderRemoveLiquidityConfirm = useCallback(
    () => (confirmedQuote ? <RemoveLiquidityConfirm confirmedQuote={confirmedQuote} /> : <></>),
    [confirmedQuote],
  )
  const renderRemoveLiquidityStatus = useCallback(
    () => (confirmedQuote ? <RemoveLiquidityStatus confirmedQuote={confirmedQuote} /> : <></>),
    [confirmedQuote],
  )

  const renderRemoveLiquiditySweep = useCallback(
    () =>
      confirmedQuote ? (
        <RemoveLiquiditySweep
          confirmedQuote={confirmedQuote}
          // eslint-disable-next-line react-memo/require-usememo
          onSweepSeen={() => {
            history.push(RemoveLiquidityRoutePaths.Confirm)
          }}
          // eslint-disable-next-line react-memo/require-usememo
          onBack={() => {
            history.push(RemoveLiquidityRoutePaths.Input)
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
          <Route
            key={RemoveLiquidityRoutePaths.Sweep}
            path={RemoveLiquidityRoutePaths.Sweep}
            render={renderRemoveLiquiditySweep}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
