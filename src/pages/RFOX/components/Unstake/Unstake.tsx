import { foxEthLpArbitrumAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_LP_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { getRfoxProxyContract } from 'pages/RFOX/helpers'
import { useGetUnstakingRequestCountQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestCountQuery'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useStakingBalanceOfQuery } from 'pages/RFOX/hooks/useStakingBalanceOfQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'

import type { RfoxUnstakingQuote, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const UnstakeInput = makeSuspenseful(
  lazy(() =>
    import('./UnstakeInput').then(({ UnstakeInput }) => ({
      default: UnstakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./UnstakeConfirm').then(({ UnstakeConfirm }) => ({
      default: UnstakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeStatus = makeSuspenseful(
  lazy(() =>
    import('./UnstakeStatus').then(({ UnstakeStatus }) => ({
      default: UnstakeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
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
  const queryClient = useQueryClient()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxUnstakingQuote | undefined>()
  const [unstakeTxid, setUnstakeTxid] = useState<string | undefined>()

  const { queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey } = useStakingInfoQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
  })

  const { queryKey: lpUserStakingBalanceOfCryptoBaseUnitQueryKey } = useStakingInfoQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
    stakingAssetId: foxEthLpArbitrumAssetId,
  })

  const { queryKey: newContractBalanceOfCryptoBaseUnitQueryKey } = useStakingBalanceOfQuery({
    stakingAssetId: confirmedQuote ? confirmedQuote.stakingAssetId : undefined,
    stakingAssetAccountAddress: getRfoxProxyContract(confirmedQuote?.stakingAssetId),
  })

  const { queryKey: lpNewContractBalanceOfCryptoBaseUnitQueryKey } = useStakingBalanceOfQuery({
    stakingAssetId: foxEthLpArbitrumAssetId,
    stakingAssetAccountAddress: getRfoxProxyContract(confirmedQuote?.stakingAssetId),
  })

  const { queryKey: unstakingRequestCountQueryKey } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
  })

  const { queryKey: lpUnstakingRequestCountQueryKey } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
    contractAddress: RFOX_LP_PROXY_CONTRACT,
  })

  const { queryKey: unstakingRequestQueryKey } = useGetUnstakingRequestsQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? fromAccountId(confirmedQuote.stakingAssetAccountId).account
      : undefined,
  })

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: lpUserStakingBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: newContractBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: lpNewContractBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestCountQueryKey })
    await queryClient.invalidateQueries({ queryKey: lpUnstakingRequestCountQueryKey })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestQueryKey })
  }, [
    lpNewContractBalanceOfCryptoBaseUnitQueryKey,
    newContractBalanceOfCryptoBaseUnitQueryKey,
    queryClient,
    unstakingRequestCountQueryKey,
    unstakingRequestQueryKey,
    userStakingBalanceOfCryptoBaseUnitQueryKey,
    lpUserStakingBalanceOfCryptoBaseUnitQueryKey,
    lpUnstakingRequestCountQueryKey,
  ])

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
        setUnstakeTxid={setUnstakeTxid}
        onTxConfirmed={handleTxConfirmed}
        confirmedQuote={confirmedQuote}
        headerComponent={headerComponent}
      />
    )
  }, [confirmedQuote, handleTxConfirmed, headerComponent, unstakeTxid])

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
