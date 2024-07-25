import { arbitrumChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { getAddress } from 'viem'
import { useGetUnstakingRequestCountQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestCountQuery'
import { useGetUnstakingRequestsQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestsQuery'
import { useStakingBalanceOfQuery } from 'pages/RFOX/hooks/useStakingBalanceOfQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { useAppDispatch } from 'state/store'

import type { RfoxUnstakingQuote, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

const suspenseFallback = <div>Loading...</div>

const UnstakeInput = makeSuspenseful(
  lazy(() =>
    import('./UnstakeInput').then(({ UnstakeInput }) => ({
      default: UnstakeInput,
    })),
  ),
)

const UnstakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./UnstakeConfirm').then(({ UnstakeConfirm }) => ({
      default: UnstakeConfirm,
    })),
  ),
)

const UnstakeStatus = makeSuspenseful(
  lazy(() =>
    import('./UnstakeStatus').then(({ UnstakeStatus }) => ({
      default: UnstakeStatus,
    })),
  ),
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

  const dispatch = useAppDispatch()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxUnstakingQuote | undefined>()
  const [unstakeTxid, setUnstakeTxid] = useState<string | undefined>()

  const { queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey } = useStakingInfoQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? getAddress(fromAccountId(confirmedQuote.stakingAssetAccountId).account)
      : undefined,
  })

  const { queryKey: newContractBalanceOfCryptoBaseUnitQueryKey } = useStakingBalanceOfQuery({
    stakingAssetId: confirmedQuote ? confirmedQuote.stakingAssetId : undefined,
    stakingAssetAccountAddress: RFOX_PROXY_CONTRACT_ADDRESS,
  })

  const { queryKey: unstakingRequestCountQueryKey } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? getAddress(fromAccountId(confirmedQuote.stakingAssetAccountId).account)
      : undefined,
  })

  const { queryKey: unstakingRequestQueryKey } = useGetUnstakingRequestsQuery({
    stakingAssetAccountAddress: confirmedQuote
      ? getAddress(fromAccountId(confirmedQuote.stakingAssetAccountId).account)
      : undefined,
  })

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userStakingBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: newContractBalanceOfCryptoBaseUnitQueryKey })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestCountQueryKey })
    await queryClient.invalidateQueries({ queryKey: unstakingRequestQueryKey })

    if (!confirmedQuote) return

    const { getOpportunityUserData } = opportunitiesApi.endpoints

    dispatch(
      getOpportunityUserData.initiate(
        [
          {
            opportunityId: toOpportunityId({
              assetNamespace: fromAssetId(confirmedQuote.stakingAssetId).assetNamespace,
              chainId: arbitrumChainId,
              assetReference: fromAssetId(confirmedQuote.stakingAssetId).assetReference,
            }),
            accountId: confirmedQuote.stakingAssetAccountId,
            defiProvider: DefiProvider.rFOX,
            defiType: DefiType.Staking,
          },
        ],
        { forceRefetch: true },
      ),
    )
  }, [
    newContractBalanceOfCryptoBaseUnitQueryKey,
    queryClient,
    unstakingRequestCountQueryKey,
    unstakingRequestQueryKey,
    userStakingBalanceOfCryptoBaseUnitQueryKey,
    confirmedQuote,
    dispatch,
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
