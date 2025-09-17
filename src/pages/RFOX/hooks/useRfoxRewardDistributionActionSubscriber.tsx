import { arbitrumChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useEffect, useMemo } from 'react'

import { useActionCenterContext } from '../../../components/Layout/Header/ActionCenter/ActionCenterContext'
import { useNotificationToast } from '../../../hooks/useNotificationToast'
import { actionSlice } from '../../../state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '../../../state/slices/actionSlice/types'
import { selectAccountIdsByChainIdFilter } from '../../../state/slices/selectors'
import { useAppDispatch, useAppSelector } from '../../../state/store'
import type { RewardDistributionWithMetadata } from './useLifetimeRewardDistributionsQuery'
import { useLifetimeRewardDistributionsQuery } from './useLifetimeRewardDistributionsQuery'

import { RewardDistributionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/RewardDistributionNotification'

export const useRfoxRewardDistributionActionSubscriber = () => {
  console.log('🔴 REPRO DEBUG: useRfoxRewardDistributionActionSubscriber hook called')

  const stakingAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(
      actionSlice.actions.upsertAction({
        id: 'reward-distribution-13-0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56-thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
        type: ActionType.RewardDistribution,
        status: ActionStatus.Initiated, // NOT Complete - this triggers the loop
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rewardDistributionMetadata: {
          distribution: {
            epoch: 13,
            stakingContract: '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56',
            rewardAddress: 'thor125dwsa39yeylqc7pn59l079dur502nsleyrgup',
            status: 'complete',
            txId: '0xfake123',
          },
          txHash: '0xfake123',
        },
      }),
    )
  }, [dispatch])

  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const stakingAssetAccountAddresses = useMemo(
    () => stakingAssetAccountIds.map(accountId => fromAccountId(accountId).account),
    [stakingAssetAccountIds],
  )

  const lifetimeRewardDistributionsQuery = useLifetimeRewardDistributionsQuery({
    stakingAssetAccountAddresses,
  })

  const rewardDistributionsByTxId = useMemo(() => {
    if (!lifetimeRewardDistributionsQuery.data) return {}

    return lifetimeRewardDistributionsQuery.data.reduce<
      Record<string, RewardDistributionWithMetadata>
    >((acc, rewardDistribution) => {
      acc[rewardDistribution.txId || rewardDistribution.stakingContract] = rewardDistribution
      return acc
    }, {})
  }, [lifetimeRewardDistributionsQuery])

  useEffect(() => {
    const now = Date.now()

    Object.entries(rewardDistributionsByTxId).forEach(([_, distribution]) => {
      if (!distribution) return

      if (distribution.status === 'pending') {
        const actionId = `reward-distribution-${distribution.epoch}-${distribution.stakingContract}-${distribution.rewardAddress}`

        if (actions[actionId]) return

        dispatch(
          actionSlice.actions.upsertAction({
            id: actionId,
            type: ActionType.RewardDistribution,
            status: ActionStatus.Initiated,
            createdAt: now,
            updatedAt: now,
            rewardDistributionMetadata: {
              distribution,
              txHash: distribution.txId || undefined,
            },
          }),
        )

        if (!toast.isActive(actionId)) {
          toast({
            id: actionId,
            status: 'info',
            render: ({ onClose, ...props }) => {
              const handleClick = () => {
                onClose()
                openActionCenter()
              }

              return (
                <RewardDistributionNotification
                  // eslint-disable-next-line react-memo/require-usememo
                  handleClick={handleClick}
                  actionId={actionId}
                  distribution={distribution}
                  onClose={onClose}
                  {...props}
                />
              )
            },
          })
        }
      }
    })
  }, [rewardDistributionsByTxId, dispatch, toast, isDrawerOpen, openActionCenter, actions])

  useEffect(() => {
    console.log('🔴 REPRO DEBUG: COMPLETE useEffect triggered')
    console.log(
      '🔴 REPRO DEBUG: rewardDistributionsByTxId keys:',
      Object.keys(rewardDistributionsByTxId),
    )
    console.log('🔴 REPRO DEBUG: Current actions in store:', Object.keys(actions).length, 'actions')

    const now = Date.now()

    Object.entries(rewardDistributionsByTxId).forEach(([txId, distribution]) => {
      if (!distribution) return

      if (distribution.status === 'complete' && distribution.txId) {
        const actionId = `reward-distribution-${distribution.epoch}-${distribution.stakingContract}-${distribution.rewardAddress}`

        console.log(`🔴 REPRO DEBUG: Processing COMPLETE distribution ${actionId}`)
        console.log(`🔴 REPRO DEBUG: Action exists in store:`, !!actions[actionId])

        if (!actions[actionId]) {
          console.log(`🔴 REPRO DEBUG: COMPLETE action ${actionId} doesn't exist, skipping`)
          return
        }

        console.log(`🔴 REPRO DEBUG: Dispatching COMPLETE action ${actionId}`)
        dispatch(
          actionSlice.actions.upsertAction({
            id: actionId,
            type: ActionType.RewardDistribution,
            status: ActionStatus.Complete,
            createdAt: now,
            updatedAt: now,
            rewardDistributionMetadata: {
              distribution,
              txHash: distribution.txId,
            },
          }),
        )

        if (!toast.isActive(actionId)) {
          toast({
            id: actionId,
            status: 'success',
            render: ({ onClose, ...props }) => {
              const handleClick = () => {
                onClose()
                openActionCenter()
              }

              return (
                <RewardDistributionNotification
                  // eslint-disable-next-line react-memo/require-usememo
                  handleClick={handleClick}
                  actionId={actionId}
                  distribution={distribution}
                  onClose={onClose}
                  {...props}
                />
              )
            },
          })
        }
      }
    })
  }, [rewardDistributionsByTxId, dispatch, toast, isDrawerOpen, openActionCenter, actions])
}
