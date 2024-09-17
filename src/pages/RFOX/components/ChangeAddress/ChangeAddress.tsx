import { fromAccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'

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

export const ChangeAddress: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={ChangeAddressEntries} initialIndex={0}>
      <ChangeAddressRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const ChangeAddressRoutes: React.FC<ChangeAddressRouteProps> = ({ headerComponent }) => {
  const location = useLocation()
  const queryClient = useQueryClient()

  const [changeAddressTxid, setChangeAddressTxid] = useState<string | undefined>()
  const [confirmedQuote, setConfirmedQuote] = useState<RfoxChangeAddressQuote | undefined>()

  const { queryKey: stakingInfoQueryKey } = useStakingInfoQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
  })

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: stakingInfoQueryKey })
  }, [queryClient, stakingInfoQueryKey])

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

  const renderChangeAddressStatus = useCallback(() => {
    if (!changeAddressTxid) return null
    if (!confirmedQuote) return null

    return (
      <ChangeAddressStatus
        txId={changeAddressTxid}
        setChangeAddressTxid={setChangeAddressTxid}
        confirmedQuote={confirmedQuote}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
      />
    )
  }, [changeAddressTxid, confirmedQuote, handleTxConfirmed, headerComponent])

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
