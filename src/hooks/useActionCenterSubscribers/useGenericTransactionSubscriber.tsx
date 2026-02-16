import { usePrevious } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { parseAndUpsertSecondClassChainTx } from '@/lib/utils/secondClassChainTx'
import { fetchAction } from '@/lib/yieldxyz/api'
import { ActionStatus as YieldActionStatus } from '@/lib/yieldxyz/types'
import { getAffiliateRevenueUsdQueryKey } from '@/pages/RFOX/hooks/useAffiliateRevenueUsdQuery'
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

const displayTypeFailedMessagesMap: Partial<Record<ActionType, DisplayTypeMessageMap>> = {
  [ActionType.Deposit]: {
    [GenericTransactionDisplayType.Yield]: 'actionCenter.deposit.failed',
  },
  [ActionType.Withdraw]: {
    [GenericTransactionDisplayType.Yield]: 'actionCenter.withdrawal.failed',
  },
  [ActionType.Claim]: {
    [GenericTransactionDisplayType.Yield]: 'actionCenter.claim.failed',
  },
}

const YIELD_POLL_INTERVAL_MS = 5000

export const useGenericTransactionSubscriber = () => {
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingGenericTransactionActions = useAppSelector(selectPendingGenericTransactionActions)
  const txs = useAppSelector(selectTxs)
  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()
  const queryClient = useQueryClient()
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const clearPollingInterval = useCallback((key: string) => {
    const intervalId = pollingIntervalsRef.current.get(key)
    if (intervalId) {
      clearInterval(intervalId)
      pollingIntervalsRef.current.delete(key)
    }
  }, [])

  const fireToast = useCallback(
    (action: (typeof pendingGenericTransactionActions)[number], status: 'success' | 'error') => {
      if (toast.isActive(action.transactionMetadata.txHash)) return

      toast({
        id: action.transactionMetadata.txHash,
        duration: status === 'success' && !isDrawerOpen ? null : 5000,
        status,
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
    },
    [isDrawerOpen, openActionCenter, toast],
  )

  useEffect(() => {
    // Cleanup intervals for actions that are no longer pending
    pollingIntervalsRef.current.forEach((_, key) => {
      const actionId = key.replace(/^(?:yield|claim)_/, '')
      const stillPending = pendingGenericTransactionActions.some(a => a.id === actionId)
      if (!stillPending) clearPollingInterval(key)
    })

    pendingGenericTransactionActions.forEach(action => {
      if (action.status !== ActionStatus.Pending && action.status !== ActionStatus.Initiated) return

      // Approvals, RFOX and TCY TODO: handle more
      if (
        !action.transactionMetadata.displayType ||
        ![
          GenericTransactionDisplayType.RFOX,
          GenericTransactionDisplayType.TCY,
          GenericTransactionDisplayType.FoxFarm,
          GenericTransactionDisplayType.Approve,
          GenericTransactionDisplayType.Yield,
          GenericTransactionDisplayType.Claim,
        ].includes(action.transactionMetadata.displayType)
      ) {
        return
      }

      const {
        accountId,
        txHash,
        thorMemo,
        queryId,
        assetId,
        yieldActionId,
        chainId,
        cooldownExpiryTimestamp,
      } = action.transactionMetadata

      // Yield claim actions with cooldown → check if cooldown has expired
      if (
        action.transactionMetadata.displayType === GenericTransactionDisplayType.Claim &&
        cooldownExpiryTimestamp
      ) {
        const pollingKey = `claim_${action.id}`
        if (pollingIntervalsRef.current.has(pollingKey)) return

        const checkCooldownExpiry = () => {
          if (Date.now() >= cooldownExpiryTimestamp) {
            dispatch(
              actionSlice.actions.upsertAction({
                ...action,
                status: ActionStatus.ClaimAvailable,
                updatedAt: Date.now(),
                transactionMetadata: {
                  ...action.transactionMetadata,
                  message: 'actionCenter.yield.unstakeReady',
                },
              }),
            )

            fireToast(action, 'success')
            clearPollingInterval(pollingKey)
          }
        }

        checkCooldownExpiry()
        if (pollingIntervalsRef.current.has(pollingKey)) return
        const intervalId = setInterval(checkCooldownExpiry, 60_000)
        pollingIntervalsRef.current.set(pollingKey, intervalId)
        return
      }

      // Yield actions with yieldActionId → poll yield.xyz API (unified, all chains)
      if (
        action.transactionMetadata.displayType === GenericTransactionDisplayType.Yield &&
        yieldActionId
      ) {
        const pollingKey = `yield_${action.id}`
        if (pollingIntervalsRef.current.has(pollingKey)) return

        const checkYieldStatus = async () => {
          try {
            const yieldAction = await fetchAction(yieldActionId)

            if (yieldAction.status === YieldActionStatus.Success) {
              try {
                await parseAndUpsertSecondClassChainTx({
                  chainId,
                  txHash,
                  accountId,
                  dispatch,
                })
              } catch (e) {
                console.error('Failed to parse yield Tx:', e)
              }

              const { cooldownPeriodSeconds } = action.transactionMetadata
              const isExitWithCooldown =
                action.type === ActionType.Withdraw && cooldownPeriodSeconds

              if (isExitWithCooldown) {
                dispatch(
                  actionSlice.actions.upsertAction({
                    ...action,
                    type: ActionType.Claim,
                    status: ActionStatus.Initiated,
                    updatedAt: Date.now(),
                    transactionMetadata: {
                      ...action.transactionMetadata,
                      displayType: GenericTransactionDisplayType.Claim,
                      message: 'actionCenter.yield.unstakeAvailableIn',
                      cooldownExpiryTimestamp: Date.now() + cooldownPeriodSeconds * 1000,
                    },
                  }),
                )

                fireToast(action, 'success')
              } else {
                const typeMessagesMap = displayTypeMessagesMap[action.type]
                const message =
                  typeMessagesMap?.[action.transactionMetadata.displayType] ??
                  action.transactionMetadata.message

                dispatch(
                  actionSlice.actions.upsertAction({
                    ...action,
                    status: ActionStatus.Complete,
                    updatedAt: Date.now(),
                    transactionMetadata: {
                      ...action.transactionMetadata,
                      message,
                    },
                  }),
                )

                fireToast(action, 'success')
              }

              queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
              queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })

              clearPollingInterval(pollingKey)
            } else if (
              yieldAction.status === YieldActionStatus.Failed ||
              yieldAction.status === YieldActionStatus.Canceled
            ) {
              const failedMessagesMap = displayTypeFailedMessagesMap[action.type]
              const failedMessage =
                failedMessagesMap?.[action.transactionMetadata.displayType] ??
                action.transactionMetadata.message

              dispatch(
                actionSlice.actions.upsertAction({
                  ...action,
                  status: ActionStatus.Failed,
                  updatedAt: Date.now(),
                  transactionMetadata: {
                    ...action.transactionMetadata,
                    message: failedMessage,
                  },
                }),
              )

              fireToast(action, 'error')
              clearPollingInterval(pollingKey)
            }
          } catch (e) {
            console.error('Error polling yield action:', e)
          }
        }

        checkYieldStatus()
        const intervalId = setInterval(checkYieldStatus, YIELD_POLL_INTERVAL_MS)
        pollingIntervalsRef.current.set(pollingKey, intervalId)
        return
      }

      // Non-yield: existing txs[serializedTxIndex] lookup
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
          queryKey: getAffiliateRevenueUsdQueryKey({
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

      // Invalidate yield balances when yield transactions complete via txs lookup
      if (action.transactionMetadata.displayType === GenericTransactionDisplayType.Yield) {
        queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
        queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })
      }

      fireToast(action, 'success')
    })
  }, [
    pendingGenericTransactionActions,
    dispatch,
    txs,
    fireToast,
    clearPollingInterval,
    currentEpochMetadataQuery.data?.epochEndTimestamp,
    currentEpochMetadataQuery.data?.epochStartTimestamp,
    queryClient,
  ])

  // Cleanup polling intervals on unmount
  useEffect(() => {
    const intervals = pollingIntervalsRef.current
    return () => {
      intervals.forEach(intervalId => clearInterval(intervalId))
      intervals.clear()
    }
  }, [])

  // Close toasts when action center drawer opens
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])
}
