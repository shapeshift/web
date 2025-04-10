import { fromAccountId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { ChangeAddressRouteProps, RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths } from './types'

import { getStakingInfoQueryKey } from '@/pages/RFOX/hooks/useStakingInfoQuery'
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

const ChangeAddressStatus = makeSuspenseful(
  lazy(() =>
    import('./ChangeAddressStatus').then(({ ChangeAddressStatus }) => ({
      default: ChangeAddressStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
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

  const stakingAssetAccountAddress = useMemo(() => {
    return confirmedQuote ? fromAccountId(confirmedQuote.stakingAssetAccountId).account : undefined
  }, [confirmedQuote])

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getStakingInfoQueryKey({
        stakingAssetId: confirmedQuote?.stakingAssetId,
        stakingAssetAccountAddress,
      }),
    })
  }, [confirmedQuote, queryClient, stakingAssetAccountAddress])

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
      <Suspense fallback={suspenseFallback}>
        <Switch location={location.pathname}>
          <Route path={ChangeAddressRoutePaths.Input}>{renderChangeAddressInput()}</Route>
          <Route path={ChangeAddressRoutePaths.Confirm}>{renderChangeAddressConfirm()}</Route>
          <Route path={ChangeAddressRoutePaths.Status}>{renderChangeAddressStatus()}</Route>
          <Route path='*'>{renderChangeAddressInput()}</Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
