import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { getAffiliateRevenueQueryKey } from '@/pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { getEarnedQueryKey } from '@/pages/RFOX/hooks/useEarnedQuery'
import { getEpochHistoryQueryKey } from '@/pages/RFOX/hooks/useEpochHistoryQuery'
import { getStakingBalanceOfQueryKey } from '@/pages/RFOX/hooks/useStakingBalanceOfQuery'
import { getStakingInfoQueryKey } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { getTimeInPoolQueryKey } from '@/pages/RFOX/hooks/useTimeInPoolQuery'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingGenericTransactionActions } from '@/state/slices/actionSlice/selectors'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useGenericTransactionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingGenericTransactionActions = useAppSelector(selectPendingGenericTransactionActions)
  const txs = useAppSelector(selectTxs)
  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()
  const queryClient = useQueryClient()

  useEffect(() => {
    pendingGenericTransactionActions.forEach(async action => {
      if (action.status !== ActionStatus.Pending) return
      // RFOX stake/unstake only for now, TODO: handle more
      if (action.transactionMetadata.displayType !== GenericTransactionDisplayType.RFOX) return

      const { accountId, txHash } = action.transactionMetadata
      const accountAddress = fromAccountId(accountId).account
      const serializedTxIndex = serializeTxIndex(accountId, txHash, accountAddress)
      const tx = txs[serializedTxIndex]

      if (!tx) return
      if (tx.status !== TxStatus.Confirmed) return

      // TODO(gomes): refer to the todo above, for now this just handles RFOX stake/unstake - to-be-generalized when handling more providers/actions
      const message =
        action.type === ActionType.Deposit ? 'RFOX.stakeSuccess' : 'RFOX.unstakeSuccess'

      const stakingAssetId = action.transactionMetadata.assetId
      const stakingAssetAccountId = action.transactionMetadata.accountId

      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Complete,
          transactionMetadata: {
            ...action.transactionMetadata,
            message,
          },
        }),
      )

      await queryClient.invalidateQueries({
        queryKey: getStakingInfoQueryKey({
          stakingAssetId,
          stakingAssetAccountId,
        }),
      })
      await queryClient.invalidateQueries({
        queryKey: getStakingBalanceOfQueryKey({
          stakingAssetId,
          accountId: stakingAssetAccountId,
        }),
      })
      await queryClient.invalidateQueries({
        queryKey: getTimeInPoolQueryKey({
          stakingAssetId,
          stakingAssetAccountId,
        }),
      })
      await queryClient.invalidateQueries({
        queryKey: getEpochHistoryQueryKey(),
      })
      await queryClient.invalidateQueries({
        queryKey: getEarnedQueryKey({
          stakingAssetId,
          stakingAssetAccountId,
        }),
      })
      await queryClient.invalidateQueries({
        queryKey: getAffiliateRevenueQueryKey({
          startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
          endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
        }),
      })

      await queryClient.invalidateQueries({
        queryKey: ['getUnstakingRequests', { stakingAssetAccountId }],
      })

      // No double-toasty
      if (toast.isActive(action.transactionMetadata.txHash)) return

      toast({
        id: action.transactionMetadata.txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              // eslint-disable-next-line react-memo/require-usememo
              handleClick={handleClick}
              actionId={action.id}
              onClose={onClose}
              {...props}
            />
          )
        },
      })
    })
  }, [
    pendingGenericTransactionActions,
    dispatch,
    txs,
    isDrawerOpen,
    openActionCenter,
    toast,
    currentEpochMetadataQuery.data?.epochEndTimestamp,
    currentEpochMetadataQuery.data?.epochStartTimestamp,
    queryClient,
  ])
}
