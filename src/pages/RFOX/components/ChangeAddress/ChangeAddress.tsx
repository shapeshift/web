import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { ChangeAddressRouteProps, RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths } from './types'

import { makeSuspenseful } from '@/utils/makeSuspenseful'

const suspenseFallback = <div>Loading...</div>

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const ChangeAddressInput = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressInput').then(({ ChangeAddressInput }) => ({
      default: ChangeAddressInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ChangeAddressConfirm = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressConfirm').then(({ ChangeAddressConfirm }) => ({
      default: ChangeAddressConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ChangeAddressEntries = [ChangeAddressRoutePaths.Input, ChangeAddressRoutePaths.Confirm]

export const ChangeAddress: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={ChangeAddressEntries} initialIndex={0}>
      <ChangeAddressRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const ChangeAddressRoutes: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const [changeAddressTxid, setChangeAddressTxid] = useState<string | undefined>()
  const [confirmedQuote, setConfirmedQuote] = useState<RfoxChangeAddressQuote | undefined>()

  const renderChangeAddressInput = useCallback(() => {
    return (
      <ChangeAddressInput headerComponent={headerComponent} setConfirmedQuote={setConfirmedQuote} />
    )
  }, [headerComponent])

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

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        <Switch location={location.pathname}>
          <Route path={ChangeAddressRoutePaths.Input}>{renderChangeAddressInput()}</Route>
          <Route path={ChangeAddressRoutePaths.Confirm}>{renderChangeAddressConfirm()}</Route>
          <Route path='*'>{renderChangeAddressInput()}</Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
