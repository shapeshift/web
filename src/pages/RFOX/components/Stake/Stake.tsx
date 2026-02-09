import React, { lazy, useCallback, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import type { RfoxStakingQuote, StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const StakeInput = makeSuspenseful(
  lazy(() =>
    import('./StakeInput').then(({ StakeInput }) => ({
      default: StakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./StakeConfirm').then(({ StakeConfirm }) => ({
      default: StakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const BridgeConfirm = makeSuspenseful(
  lazy(() =>
    import('./Bridge/BridgeConfirm').then(({ BridgeConfirm }) => ({
      default: BridgeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const BridgeStatus = makeSuspenseful(
  lazy(() =>
    import('./Bridge/BridgeStatus').then(({ BridgeStatus }) => ({
      default: BridgeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm]

export const Stake: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<StakeRouteProps> = ({ headerComponent }) => {
  const location = useLocation()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxStakingQuote | undefined>()
  const [stakeTxid, setStakeTxid] = useState<string | undefined>()

  const { stakingAssetId } = useRFOXContext()

  // Get bridge quote from location.state
  const maybeBridgeQuote = location.state as RfoxBridgeQuote | undefined

  const renderStakeInput = useCallback(() => {
    return (
      <StakeInput
        stakingAssetId={stakingAssetId}
        headerComponent={headerComponent}
        setConfirmedQuote={setConfirmedQuote}
      />
    )
  }, [headerComponent, stakingAssetId])

  const renderStakeConfirm = useCallback(() => {
    if (!confirmedQuote) return null

    return (
      <StakeConfirm
        stakeTxid={stakeTxid}
        setStakeTxid={setStakeTxid}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, headerComponent, stakeTxid])

  const renderBridgeConfirm = useCallback(() => {
    if (!maybeBridgeQuote) return null

    return <BridgeConfirm confirmedQuote={maybeBridgeQuote} headerComponent={headerComponent} />
  }, [maybeBridgeQuote, headerComponent])

  const renderBridgeStatus = useCallback(() => {
    if (!maybeBridgeQuote) return null

    return <BridgeStatus confirmedQuote={maybeBridgeQuote} headerComponent={headerComponent} />
  }, [maybeBridgeQuote, headerComponent])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={StakeRoutePaths.Input}>{renderStakeInput()}</Route>
        <Route path={StakeRoutePaths.Confirm}>{renderStakeConfirm()}</Route>
        <Route path={BridgeRoutePaths.Confirm}>{renderBridgeConfirm()}</Route>
        <Route path={BridgeRoutePaths.Status}>{renderBridgeStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
