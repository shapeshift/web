import { fromAccountId } from '@shapeshiftoss/caip'
import { useEffect, useMemo } from 'react'

import { useActionCenterContext } from '../../../components/Layout/Header/ActionCenter/ActionCenterContext'
import { useNotificationToast } from '../../../hooks/useNotificationToast'
import { actionSlice } from '../../../state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '../../../state/slices/actionSlice/types'
import { selectWalletAccountIds } from '../../../state/slices/selectors'
import { useAppDispatch, useAppSelector } from '../../../state/store'
import type { RewardDistributionWithMetadata } from './useLifetimeRewardDistributionsQuery'
import { useLifetimeRewardDistributionsQuery } from './useLifetimeRewardDistributionsQuery'

import { RewardDistributionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/RewardDistributionNotification'
import { RFOX_STAKING_CHAIN_IDS } from '@/pages/RFOX/constants'

export const useRfoxRewardDistributionActionSubscriber = () => {
  const walletAccountIds = useAppSelector(selectWalletAccountIds)
  const stakingAssetAccountIds = useMemo(
    () =>
      walletAccountIds.filter(accountId =>
        RFOX_STAKING_CHAIN_IDS.includes(fromAccountId(accountId).chainId),
      ),
    [walletAccountIds],
  )
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const toastOptions = useMemo(
    () => ({
      duration: isDrawerOpen ? 5000 : null,
    }),
    [isDrawerOpen],
  )
  const toast = useNotificationToast(toastOptions)

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
  }, [lifetimeRewardDistributionsQuery.data])

  useEffect(() => {
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
            createdAt: distribution.distributionTimestamp,
            updatedAt: distribution.distributionTimestamp,
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
  }, [rewardDistributionsByTxId, dispatch, toast, openActionCenter, actions])

  useEffect(() => {
    Object.entries(rewardDistributionsByTxId).forEach(([_, distribution]) => {
      if (!distribution) return

      if (distribution.status === 'complete' && distribution.txId) {
        const actionId = `reward-distribution-${distribution.epoch}-${distribution.stakingContract}-${distribution.rewardAddress}`

        const existingAction = actions[actionId]

        if (existingAction?.status === ActionStatus.Complete) {
          return
        }

        dispatch(
          actionSlice.actions.upsertAction({
            id: actionId,
            type: ActionType.RewardDistribution,
            status: ActionStatus.Complete,
            createdAt: distribution.distributionTimestamp,
            updatedAt: distribution.distributionTimestamp,
            rewardDistributionMetadata: {
              distribution,
              txHash: distribution.txId,
            },
          }),
        )

        if (!toast.isActive(actionId) && existingAction) {
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
  }, [rewardDistributionsByTxId, dispatch, toast, openActionCenter, actions])
}
