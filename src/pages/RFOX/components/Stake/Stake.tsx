import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import type { StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const StakeInput = makeSuspenseful(
  lazy(() =>
    import('./StakeInput').then(({ StakeInput }) => ({
      default: StakeInput,
    })),
  ),
)

const StakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./StakeConfirm').then(({ StakeConfirm }) => ({
      default: StakeConfirm,
    })),
  ),
)

const StakeStatus = makeSuspenseful(
  lazy(() =>
    import('./StakeStatus').then(({ StakeStatus }) => ({
      default: StakeStatus,
    })),
  ),
)

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm, StakeRoutePaths.Status]

export const Stake: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  // For future use
  const [runeAddress, setRuneAddress] = useState<string | undefined>()

  const renderStakeInput = useCallback(() => {
    return (
      <StakeInput
        stakingAssetId={foxOnArbitrumOneAssetId}
        runeAddress={runeAddress}
        headerComponent={headerComponent}
        onRuneAddressChange={setRuneAddress}
      />
    )
  }, [headerComponent, runeAddress])

  const renderStakeConfirm = useCallback(() => {
    if (!runeAddress) return null

    return <StakeConfirm runeAddress={runeAddress} headerComponent={headerComponent} />
  }, [headerComponent, runeAddress])

  const renderStakeStatus = useCallback(() => {
    return <StakeStatus headerComponent={headerComponent} />
  }, [headerComponent])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location}>
        <Suspense fallback={suspenseFallback}>
          <Route
            key={StakeRoutePaths.Input}
            path={StakeRoutePaths.Input}
            render={renderStakeInput}
          />
          <Route
            key={StakeRoutePaths.Confirm}
            path={StakeRoutePaths.Confirm}
            render={renderStakeConfirm}
          />
          <Route
            key={StakeRoutePaths.Status}
            path={StakeRoutePaths.Status}
            render={renderStakeStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
