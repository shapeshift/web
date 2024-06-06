import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'

import { BridgeRoutePaths, type RfoxBridgeQuote } from './Bridge/types'
import type { RfoxStakingQuote, StakeRouteProps } from './types'
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

const BridgeConfirm = makeSuspenseful(
  lazy(() =>
    import('./Bridge/BridgeConfirm').then(({ BridgeConfirm }) => ({
      default: BridgeConfirm,
    })),
  ),
)

const BridgeStatus = makeSuspenseful(
  lazy(() =>
    import('./Bridge/BridgeStatus').then(({ BridgeStatus }) => ({
      default: BridgeStatus,
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
  const location = useLocation<RfoxBridgeQuote | undefined>()
  const { state: maybeBridgeQuote } = location

  const [runeAddress, setRuneAddress] = useState<string | undefined>()
  const [confirmedQuote, setConfirmedQuote] = useState<RfoxStakingQuote | undefined>()
  const [stakeTxid, setStakeTxid] = useState<string | undefined>()

  const queryClient = useQueryClient()

  const { queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'stakingInfo',
    args: [
      // actually defined by the time we actually consume the queryKey
      confirmedQuote
        ? getAddress(fromAccountId(confirmedQuote.stakingAssetAccountId).account)
        : ('' as Address),
    ],
    chainId: arbitrum.id,
  })

  const { queryKey: newContractBalanceOfCryptoBaseUnitQueryKey } = useReadContract({
    abi: erc20ABI,
    // actually defined by the time we actually consume the queryKey
    address: confirmedQuote
      ? getAddress(fromAssetId(confirmedQuote.stakingAssetId).assetReference)
      : ('' as Address),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
  })
  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: newContractBalanceOfCryptoBaseUnitQueryKey })
  }, [
    newContractBalanceOfCryptoBaseUnitQueryKey,
    queryClient,
    userStakingBalanceOfCryptoBaseUnitQueryKey,
  ])

  const renderStakeInput = useCallback(() => {
    return (
      <StakeInput
        stakingAssetId={foxOnArbitrumOneAssetId}
        runeAddress={runeAddress}
        headerComponent={headerComponent}
        onRuneAddressChange={setRuneAddress}
        setConfirmedQuote={setConfirmedQuote}
      />
    )
  }, [headerComponent, runeAddress])

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

  const renderStakeStatus = useCallback(() => {
    if (!confirmedQuote) return null
    if (!stakeTxid) return null

    return (
      <StakeStatus
        txId={stakeTxid}
        confirmedQuote={confirmedQuote}
        onTxConfirmed={handleTxConfirmed}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, handleTxConfirmed, headerComponent, stakeTxid])

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
