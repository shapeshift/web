import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { RfoxUnstakingQuote, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const UnstakeInput = makeSuspenseful(
  lazy(() =>
    import('./UnstakeInput').then(({ UnstakeInput }) => ({
      default: UnstakeInput,
    })),
  ),
)

const UnstakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./UnstakeConfirm').then(({ UnstakeConfirm }) => ({
      default: UnstakeConfirm,
    })),
  ),
)

const UnstakeStatus = makeSuspenseful(
  lazy(() =>
    import('./UnstakeStatus').then(({ UnstakeStatus }) => ({
      default: UnstakeStatus,
    })),
  ),
)

const UnstakeEntries = [
  UnstakeRoutePaths.Input,
  UnstakeRoutePaths.Confirm,
  UnstakeRoutePaths.Status,
]

export const Unstake: React.FC<UnstakeRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={UnstakeEntries} initialIndex={0}>
      <UnstakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const UnstakeRoutes: React.FC<UnstakeRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxUnstakingQuote | undefined>()
  const [unstakeTxid, setUnstakeTxid] = useState<string | undefined>()

  const renderUnstakeInput = useCallback(() => {
    return <UnstakeInput setConfirmedQuote={setConfirmedQuote} headerComponent={headerComponent} />
  }, [headerComponent])

  const renderUnstakeConfirm = useCallback(() => {
    if (!confirmedQuote) return null

    return (
      <UnstakeConfirm
        confirmedQuote={confirmedQuote}
        unstakeTxid={unstakeTxid}
        setUnstakeTxid={setUnstakeTxid}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, headerComponent, unstakeTxid])

  const renderUnstakeStatus = useCallback(() => {
    if (!confirmedQuote) return null
    if (!unstakeTxid) return null

    return (
      <UnstakeStatus
        txId={unstakeTxid}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, headerComponent, unstakeTxid])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={UnstakeRoutePaths.Input}
            path={UnstakeRoutePaths.Input}
            render={renderUnstakeInput}
          />
          <Route
            key={UnstakeRoutePaths.Confirm}
            path={UnstakeRoutePaths.Confirm}
            render={renderUnstakeConfirm}
          />
          <Route
            key={UnstakeRoutePaths.Status}
            path={UnstakeRoutePaths.Status}
            render={renderUnstakeStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
