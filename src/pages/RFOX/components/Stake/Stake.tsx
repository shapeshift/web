import {
  foxOnArbitrumOneAssetId,
  fromAccountId,
  uniV2EthFoxArbitrumAssetId,
} from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { useStakingBalanceOfQuery } from 'pages/RFOX/hooks/useStakingBalanceOfQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'

import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import type { RfoxStakingQuote, StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const stakingAssetId = foxOnArbitrumOneAssetId

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

const StakeStatus = makeSuspenseful(
  lazy(() =>
    import('./StakeStatus').then(({ StakeStatus }) => ({
      default: StakeStatus,
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

const StakeEntries = [StakeRoutePaths.Input, StakeRoutePaths.Confirm, StakeRoutePaths.Status]

export const Stake: React.FC<StakeRouteProps> = ({ headerComponent, setStepIndex }) => {
  return (
    <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
      <StakeRoutes headerComponent={headerComponent} setStepIndex={setStepIndex} />
    </MemoryRouter>
  )
}

export const StakeRoutes: React.FC<StakeRouteProps> = ({ headerComponent, setStepIndex }) => {
  const location = useLocation<RfoxBridgeQuote | undefined>()
  const { state: maybeBridgeQuote } = location

  const [runeAddress, setRuneAddress] = useState<string | undefined>()
  const [confirmedQuote, setConfirmedQuote] = useState<RfoxStakingQuote | undefined>()
  const [stakeTxid, setStakeTxid] = useState<string | undefined>()

  const queryClient = useQueryClient()

  const { queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey } = useStakingInfoQuery({
    stakingAssetAccountAddress: confirmedQuote?.stakingAssetAccountId
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
    stakingAssetId: confirmedQuote?.stakingAssetId,
  })

  const { queryKey: lpUserStakingBalanceOfCryptoBaseUnitQueryKey } = useStakingInfoQuery({
    stakingAssetAccountAddress: confirmedQuote?.stakingAssetAccountId
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
    stakingAssetId: uniV2EthFoxArbitrumAssetId,
  })

  const { queryKey: newContractBalanceOfCryptoBaseUnitQueryKey } = useStakingBalanceOfQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
    stakingAssetId,
  })

  const { queryKey: lpNewContractBalanceOfCryptoBaseUnitQueryKey } = useStakingBalanceOfQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
    stakingAssetId: uniV2EthFoxArbitrumAssetId,
  })

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: lpUserStakingBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: newContractBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: lpNewContractBalanceOfCryptoBaseUnitQueryKey })
  }, [
    lpNewContractBalanceOfCryptoBaseUnitQueryKey,
    newContractBalanceOfCryptoBaseUnitQueryKey,
    queryClient,
    userStakingBalanceOfCryptoBaseUnitQueryKey,
    lpUserStakingBalanceOfCryptoBaseUnitQueryKey,
  ])

  const renderStakeInput = useCallback(() => {
    return (
      <StakeInput
        stakingAssetId={stakingAssetId}
        runeAddress={runeAddress}
        headerComponent={headerComponent}
        setStepIndex={setStepIndex}
        onRuneAddressChange={setRuneAddress}
        setConfirmedQuote={setConfirmedQuote}
      />
    )
  }, [headerComponent, runeAddress, setStepIndex])

  const renderStakeConfirm = useCallback(() => {
    if (!confirmedQuote) return null

    return (
      <StakeConfirm
        stakeTxid={stakeTxid}
        setStakeTxid={setStakeTxid}
        setStepIndex={setStepIndex}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, headerComponent, stakeTxid, setStepIndex])

  const renderStakeStatus = useCallback(() => {
    if (!confirmedQuote) return null
    if (!stakeTxid) return null

    return (
      <StakeStatus
        txId={stakeTxid}
        setStakeTxid={setStakeTxid}
        confirmedQuote={confirmedQuote}
        setStepIndex={setStepIndex}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, handleTxConfirmed, headerComponent, stakeTxid, setStepIndex])

  const renderBridgeConfirm = useCallback(() => {
    if (!maybeBridgeQuote) return null

    return <BridgeConfirm confirmedQuote={maybeBridgeQuote} headerComponent={headerComponent} />
  }, [maybeBridgeQuote, headerComponent])

  const renderBridgeStatus = useCallback(() => {
    if (!maybeBridgeQuote) return null

    return <BridgeStatus confirmedQuote={maybeBridgeQuote} headerComponent={headerComponent} />
  }, [maybeBridgeQuote, headerComponent])

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
          <Route
            key={BridgeRoutePaths.Confirm}
            path={BridgeRoutePaths.Confirm}
            render={renderBridgeConfirm}
          />
          <Route
            key={BridgeRoutePaths.Status}
            path={BridgeRoutePaths.Status}
            render={renderBridgeStatus}
          />
        </Suspense>
      </Switch>
    </AnimatePresence>
  )
}
