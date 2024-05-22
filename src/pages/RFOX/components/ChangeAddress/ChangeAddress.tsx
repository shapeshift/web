import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { ChangeAddressRouteProps, RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const ChangeAddressInput = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressInput').then(({ ChangeAddressInput }) => ({
      default: ChangeAddressInput,
    })),
  ),
)

const ChangeAddressConfirm = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressConfirm').then(({ ChangeAddressConfirm }) => ({
      default: ChangeAddressConfirm,
    })),
  ),
)

const ChangeAddressStatus = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressStatus').then(({ ChangeAddressStatus }) => ({
      default: ChangeAddressStatus,
    })),
  ),
)

const ChangeAddressEntries = [
  ChangeAddressRoutePaths.Input,
  ChangeAddressRoutePaths.Confirm,
  ChangeAddressRoutePaths.Status,
]

export const ChangeAddress: React.FC<ChangeAddressRouteProps> = ({
  headerComponent,
  setStepIndex,
}) => {
  return (
    <MemoryRouter initialEntries={ChangeAddressEntries} initialIndex={0}>
      <ChangeAddressRoutes headerComponent={headerComponent} setStepIndex={setStepIndex} />
    </MemoryRouter>
  )
}

export const ChangeAddressRoutes: React.FC<ChangeAddressRouteProps> = ({
  headerComponent,
  setStepIndex,
}) => {
  const location = useLocation()

  const [newRuneAddress, setNewRuneAddress] = useState<string | undefined>()
  const [changeAddressTxid, setChangeAddressTxid] = useState<string | undefined>()
  const [confirmedQuote, setConfirmedQuote] = useState<RfoxChangeAddressQuote | undefined>()

  const renderChangeAddressInput = useCallback(() => {
    return (
      <ChangeAddressInput
        newRuneAddress={newRuneAddress}
        onNewRuneAddressChange={setNewRuneAddress}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
        setStepIndex={setStepIndex}
      />
    )
  }, [headerComponent, newRuneAddress, setStepIndex])

  const renderChangeAddressConfirm = useCallback(() => {
    if (!confirmedQuote) return null

    return (
      <ChangeAddressConfirm
        changeAddressTxid={changeAddressTxid}
        setChangeAddressTxid={setChangeAddressTxid}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [changeAddressTxid, confirmedQuote, headerComponent])

  const renderChangeAddressStatus = useCallback(() => {
    if (!changeAddressTxid) return null
    if (!confirmedQuote) return null

    return (
      <ChangeAddressStatus
        txId={changeAddressTxid}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [changeAddressTxid, confirmedQuote, headerComponent])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={ChangeAddressRoutePaths.Input}
            path={ChangeAddressRoutePaths.Input}
            render={renderChangeAddressInput}
          />
          <Route
            key={ChangeAddressRoutePaths.Confirm}
            path={ChangeAddressRoutePaths.Confirm}
            render={renderChangeAddressConfirm}
          />
          <Route
            key={ChangeAddressRoutePaths.Status}
            path={ChangeAddressRoutePaths.Status}
            render={renderChangeAddressStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
