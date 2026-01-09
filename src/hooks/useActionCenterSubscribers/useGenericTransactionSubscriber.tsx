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
import { getTcyStakerQueryKey } from '@/pages/TCY/queries/useTcyStaker'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingGenericTransactionActions } from '@/state/slices/actionSlice/selectors'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  GenericTransactionQueryId,
} from '@/state/slices/actionSlice/types'
import { selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

type DisplayTypeMessageMap = Partial<Record<GenericTransactionDisplayType, string>>

const displayTypeMessagesMap: Partial<Record<ActionType, DisplayTypeMessageMap>> = {
  [ActionType.Deposit]: {
    [GenericTransactionDisplayType.RFOX]: 'RFOX.stakeSuccess',
    [GenericTransactionDisplayType.TCY]: 'actionCenter.tcy.stakeComplete',
    [GenericTransactionDisplayType.FoxFarm]: 'actionCenter.deposit.complete',
    [GenericTransactionDisplayType.Yield]: 'actionCenter.deposit.complete',
  },
  [ActionType.Withdraw]: {
    [GenericTransactionDisplayType.RFOX]: 'RFOX.unstakeSuccess',
    [GenericTransactionDisplayType.TCY]: 'actionCenter.tcy.unstakeComplete',
    [GenericTransactionDisplayType.FoxFarm]: 'actionCenter.withdrawal.complete',
    [GenericTransactionDisplayType.Yield]: 'actionCenter.withdrawal.complete',
  },
  [ActionType.Claim]: {
    [GenericTransactionDisplayType.FoxFarm]: 'actionCenter.claim.complete',
  },
  [ActionType.Approve]: {
    [GenericTransactionDisplayType.Approve]: 'actionCenter.approve.approvalTxComplete',
  },
  [ActionType.ChangeAddress]: {
    [GenericTransactionDisplayType.RFOX]: 'RFOX.changeAddressSuccess',
  },
}

export const useGenericTransactionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingGenericTransactionActions = useAppSelector(selectPendingGenericTransactionActions)
  const txs = useAppSelector(selectTxs)
  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()
  const queryClient = useQueryClient()

  useEffect(() => {
    pendingGenericTransactionActions.forEach(action => {
      if (action.status !== ActionStatus.Pending) return

      // Approvals, RFOX and TCY TODO: handle more
      if (
        !action.transactionMetadata.displayType ||
        ![
          GenericTransactionDisplayType.RFOX,
          GenericTransactionDisplayType.TCY,
          GenericTransactionDisplayType.FoxFarm,
          GenericTransactionDisplayType.Approve,
          GenericTransactionDisplayType.Yield,
        ].includes(action.transactionMetadata.displayType)
      ) {
        return
      }

      const { accountId, txHash, thorMemo, queryId, assetId } = action.transactionMetadata
      const accountAddress = fromAccountId(accountId).account
      const serializedTxIndex = serializeTxIndex(
        accountId,
        txHash,
        accountAddress,
        thorMemo ? { parser: 'thorchain', memo: thorMemo } : undefined,
      )
      const tx = txs[serializedTxIndex]

      if (!tx) return
      if (tx.status !== TxStatus.Confirmed) return

      const typeMessagesMap = displayTypeMessagesMap[action.type]
      const message = typeMessagesMap?.[action.transactionMetadata.displayType]

      if (!message) return

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

      // Invalidate data that's now updated
      if (queryId === GenericTransactionQueryId.RFOX) {
        queryClient.invalidateQueries({
          queryKey: getStakingInfoQueryKey({
            stakingAssetId: assetId,
            stakingAssetAccountId: accountId,
          }),
        })
        queryClient.invalidateQueries({
          queryKey: getStakingBalanceOfQueryKey({
            stakingAssetId: assetId,
            accountId,
          }),
        })
        queryClient.invalidateQueries({
          queryKey: getTimeInPoolQueryKey({
            stakingAssetId: assetId,
            stakingAssetAccountId: accountId,
          }),
        })

        queryClient.invalidateQueries({
          queryKey: getEpochHistoryQueryKey(),
        })

        queryClient.invalidateQueries({
          queryKey: getEarnedQueryKey({
            stakingAssetId: assetId,
            stakingAssetAccountId: accountId,
          }),
        })

        queryClient.invalidateQueries({
          queryKey: getAffiliateRevenueQueryKey({
            startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
            endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
          }),
        })

        queryClient.invalidateQueries({
          queryKey: ['getUnstakingRequests', { stakingAssetAccountId: accountId }],
        })
      } else if (queryId === GenericTransactionQueryId.TCY) {
        queryClient.invalidateQueries({
          queryKey: getTcyStakerQueryKey(accountId),
        })
      }

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
