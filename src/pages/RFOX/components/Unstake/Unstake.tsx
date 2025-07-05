import { useToast } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import React, { lazy, Suspense, useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import type { RfoxUnstakingQuote, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { fromBaseUnit } from '@/lib/math'
import { getStakingBalanceOfQueryKey } from '@/pages/RFOX/hooks/useStakingBalanceOfQuery'
import { getStakingInfoQueryKey } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

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
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openDrawer } = useActionCenterContext()
  const toast = useToast({ duration: isDrawerOpen ? 5000 : null, position: 'bottom-right' })
  const translate = useTranslate()

  const [confirmedQuote, setConfirmedQuote] = useState<RfoxUnstakingQuote | undefined>()
  const [unstakeTxid, setUnstakeTxid] = useState<string | undefined>()

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote?.stakingAssetId ?? ''),
  )

  const handleTxConfirmed = useCallback(async () => {
    if (!confirmedQuote || !unstakeTxid || !stakingAsset) return

    const amountCryptoPrecision = fromBaseUnit(
      confirmedQuote.unstakingAmountCryptoBaseUnit,
      stakingAsset.precision,
    )
    const cooldownPeriod = confirmedQuote.cooldownPeriod

    dispatch(
      actionSlice.actions.upsertAction({
        id: unstakeTxid,
        type: ActionType.GenericTransaction,
        status: ActionStatus.Complete,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        transactionMetadata: {
          displayType: GenericTransactionDisplayType.RFOX,
          message: translate('notificationCenter.rfox.unstakeConfirmed', {
            amount: amountCryptoPrecision,
            cooldownPeriod,
            symbol: stakingAsset.symbol,
          }),
          txHash: unstakeTxid,
          chainId: stakingAsset.chainId,
          accountId: confirmedQuote.stakingAssetAccountId,
          assetId: confirmedQuote.stakingAssetId,
        },
      }),
    )
    toast({
      id: unstakeTxid,
      duration: isDrawerOpen ? 5000 : null,
      status: 'success',
      render: ({ onClose, ...props }) => {
        const handleClick = () => {
          onClose()
          openDrawer()
        }

        return (
          <GenericTransactionNotification
            // eslint-disable-next-line react-memo/require-usememo
            handleClick={handleClick}
            actionId={unstakeTxid}
            onClose={onClose}
            {...props}
          />
        )
      },
    })

    await queryClient.invalidateQueries({
      queryKey: getStakingInfoQueryKey({
        stakingAssetId: confirmedQuote?.stakingAssetId,
        stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: getStakingBalanceOfQueryKey({
        stakingAssetId: confirmedQuote?.stakingAssetId,
        accountId: confirmedQuote.stakingAssetAccountId,
      }),
    })
    await queryClient.invalidateQueries({
      queryKey: [
        'getUnstakingRequests',
        { stakingAssetAccountId: confirmedQuote?.stakingAssetAccountId },
      ],
    })
  }, [
    confirmedQuote,
    unstakeTxid,
    dispatch,
    isDrawerOpen,
    openDrawer,
    toast,
    translate,
    stakingAsset,
    queryClient,
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
      <Suspense fallback={suspenseFallback}>
        <Switch location={location.pathname}>
          <Route path={UnstakeRoutePaths.Input}>{renderUnstakeInput()}</Route>
          <Route path={UnstakeRoutePaths.Confirm}>{renderUnstakeConfirm()}</Route>
          <Route path={UnstakeRoutePaths.Status}>{renderUnstakeStatus()}</Route>
          <Route path='*'>{renderUnstakeInput()}</Route>
        </Switch>
      </Suspense>
    </AnimatePresence>
  )
}
