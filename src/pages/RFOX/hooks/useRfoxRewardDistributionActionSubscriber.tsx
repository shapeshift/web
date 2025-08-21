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
  const stakingAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )
  const dispatch = useAppDispatch()
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
            status: ActionStatus.Pending,
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
    const now = Date.now()

    Object.entries(rewardDistributionsByTxId).forEach(([_, distribution]) => {
      if (!distribution) return

      if (distribution.status === 'complete' && distribution.txId) {
        const actionId = `reward-distribution-${distribution.epoch}-${distribution.stakingContract}-${distribution.rewardAddress}`

        if (!actions[actionId]) return

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
