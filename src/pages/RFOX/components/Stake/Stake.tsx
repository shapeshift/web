import React, { lazy, useCallback, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

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

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm]

export const Stake: React.FC<StakeRouteProps> = ({ headerComponent, onClose }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} onClose={onClose} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<StakeRouteProps> = ({ headerComponent, onClose }) => {
  const location = useLocation()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxStakingQuote | undefined>()
  const [stakeTxid, setStakeTxid] = useState<string | undefined>()

  const { stakingAssetId } = useRFOXContext()

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
        onClose={onClose}
      />
    )
  }, [confirmedQuote, headerComponent, onClose, stakeTxid])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={StakeRoutePaths.Input}>{renderStakeInput()}</Route>
        <Route path={StakeRoutePaths.Confirm}>{renderStakeConfirm()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
