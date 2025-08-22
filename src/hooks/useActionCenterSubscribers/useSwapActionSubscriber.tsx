import { usePrevious } from '@chakra-ui/react'
import { baseChainId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import {
  fetchSafeTransactionInfo,
  SwapperName,
  swappers,
  SwapStatus,
  TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
  TransactionExecutionState,
} from '@shapeshiftoss/swapper'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect, useMemo } from 'react'

import { isMobile } from '../../lib/globals'
import { preferences } from '../../state/slices/preferencesSlice/preferencesSlice'
import { fetchIsSmartContractAddressQuery } from '../useIsSmartContractAddress/useIsSmartContractAddress'
import { MobileFeature, useMobileFeaturesCompatibility } from '../useMobileFeaturesCompatibility'
import { useModal } from '../useModal/useModal'
import { useNotificationToast } from '../useNotificationToast'
import { useWallet } from '../useWallet/useWallet'
import { useBasePortfolioManagement } from './useFetchBasePortfolio'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { SwapNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification'
import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { getTxLink } from '@/lib/getTxLink'
import { fromBaseUnit } from '@/lib/math'
import { fetchTradeStatus, tradeStatusQueryKey } from '@/lib/tradeExecution'
import { vibrate } from '@/lib/vibrate'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  selectPendingSwapActions,
  selectSwapActionBySwapId,
} from '@/state/slices/actionSlice/selectors'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType, isSwapAction } from '@/state/slices/actionSlice/types'
import { selectTxById } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import {
  selectConfirmedTradeExecution,
  selectHopExecutionMetadata,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const swapStatusToActionStatus: Record<SwapStatus, ActionStatus> = {
  [SwapStatus.Idle]: ActionStatus.Idle,
  [SwapStatus.Pending]: ActionStatus.Pending,
  [SwapStatus.Success]: ActionStatus.Complete,
  [SwapStatus.Failed]: ActionStatus.Failed,
}

const getActionStatusFromSwapAndApproval = (
  swapStatus: SwapStatus,
  approvalState?: TransactionExecutionState,
  isApprovalRequired?: boolean,
): ActionStatus => {
  // If swap is pending/success/failed, use direct mapping
  if (swapStatus !== SwapStatus.Idle) {
    return swapStatusToActionStatus[swapStatus]
  }

  // For idle swaps, check approval state
  if (isApprovalRequired && approvalState !== TransactionExecutionState.Complete) {
    return ActionStatus.AwaitingApproval
  }

  return ActionStatus.AwaitingSwap
}

export const useSwapActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const hasSeenRatingModal = useAppSelector(preferences.selectors.selectHasSeenRatingModal)
  const { open: openRatingModal } = useModal('rating')
  const mobileFeaturesCompatibility = useMobileFeaturesCompatibility()
  const confirmedTradeExecution = useAppSelector(selectConfirmedTradeExecution)

  const dispatch = useAppDispatch()

  const handleHasSeenRatingModal = useCallback(() => {
    dispatch(preferences.actions.setHasSeenRatingModal())
  }, [dispatch])

  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingSwapActions = useAppSelector(selectPendingSwapActions)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const {
    state: { isConnected },
  } = useWallet()
  const activeSwapId = useAppSelector(swapSlice.selectors.selectActiveSwapId)
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  const { fetchBasePortfolio, upsertBasePortfolio } = useBasePortfolioManagement()

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  // Sync swap status with action status
  useEffect(() => {
    // Handle active swap with full lifecycle (including approval states)
    if (activeSwapId) {
      const activeSwap = swapsById[activeSwapId]
      if (
        activeSwap &&
        activeSwap.status !== SwapStatus.Success &&
        activeSwap.status !== SwapStatus.Failed
      ) {
        const existingAction = selectSwapActionBySwapId(store.getState(), {
          swapId: activeSwap.id,
        })

        const approvalMetadata = confirmedTradeExecution?.firstHop?.allowanceApproval

        // Calculate the correct action status based on swap and approval state
        const targetStatus = getActionStatusFromSwapAndApproval(
          activeSwap.status,
          approvalMetadata?.state,
          approvalMetadata?.isRequired,
        )

        // Create new action if it doesn't exist
        if (!existingAction) {
          dispatch(
            actionSlice.actions.upsertAction({
              id: uuidv4(),
              createdAt: activeSwap.createdAt,
              updatedAt: activeSwap.updatedAt,
              type: ActionType.Swap,
              status: targetStatus,
              swapMetadata: {
                swapId: activeSwap.id,
                allowanceApproval: approvalMetadata,
              },
            }),
          )
        } else if (isSwapAction(existingAction) && existingAction.status !== targetStatus) {
          // Update existing action if status changed
          dispatch(
            actionSlice.actions.upsertAction({
              ...existingAction,
              updatedAt: Date.now(),
              status: targetStatus,
              swapMetadata: {
                swapId: existingAction.swapMetadata.swapId,
                allowanceApproval: approvalMetadata,
              },
            }),
          )
        }
      }
    }

    // Handle non-active swaps
    Object.values(swapsById).forEach(swap => {
      // Skip active swap (already handled) and terminal states
      if (
        swap.id === activeSwapId ||
        swap.status === SwapStatus.Success ||
        swap.status === SwapStatus.Failed
      )
        return

      const existingAction = selectSwapActionBySwapId(store.getState(), {
        swapId: swap.id,
      })

      if (!existingAction || !isSwapAction(existingAction)) return

      // If a non-active swap is in AwaitingApproval or AwaitingSwap, set it to Idle
      // Only the active swap should be in these states
      if (
        existingAction.status === ActionStatus.AwaitingApproval ||
        existingAction.status === ActionStatus.AwaitingSwap
      ) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...existingAction,
            updatedAt: Date.now(),
            status: ActionStatus.Idle,
          }),
        )
        return
      }

      // For other non-active swaps, use direct status mapping
      const targetStatus = swapStatusToActionStatus[swap.status]

      // Only update if status changed
      if (existingAction.status !== targetStatus) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...existingAction,
            updatedAt: Date.now(),
            status: targetStatus,
          }),
        )
      }
    })
  }, [dispatch, activeSwapId, swapsById, confirmedTradeExecution])

  const swapStatusHandler = useCallback(
    async (swap: Swap, action: SwapAction) => {
      const maybeSwapper = swappers[swap.swapperName]

      if (maybeSwapper === undefined)
        throw new Error(`no swapper matching swapperName '${swap.swapperName}'`)

      const swapper = maybeSwapper

      if (!swap.sellTxHash) return
      if (!swap.receiveAddress) return

      const { status, message, buyTxHash } = await queryClient.fetchQuery({
        queryKey: tradeStatusQueryKey(swap.id, swap.sellTxHash),
        queryFn: () =>
          fetchTradeStatus({
            swapper,
            sellTxHash: swap.sellTxHash ?? '',
            sellAssetChainId: swap.sellAsset.chainId,
            address: swap.sellAccountId ? fromAccountId(swap.sellAccountId).account : undefined,
            swap,
            stepIndex: swap.metadata.stepIndex,
            config: getConfig(),
          }),
        staleTime: 10000,
        gcTime: 10000,
      })

      const { chainId, account: address } = fromAccountId(swap.sellAccountId)

      const txHash = swap.metadata.relayerTxHash ?? buyTxHash ?? swap.sellTxHash

      const maybeSafeTx = await fetchSafeTransactionInfo({
        address,
        chainId,
        safeTxHash: swap.sellTxHash,
        fetchIsSmartContractAddressQuery,
      })

      const defaultExplorerBaseUrl =
        buyTxHash && buyTxHash !== swap.sellTxHash
          ? swap.buyAsset.explorerTxLink
          : swap.sellAsset.explorerTxLink

      const txLink = getTxLink({
        address,
        chainId,
        defaultExplorerBaseUrl,
        maybeSafeTx,
        stepSource: status && status !== TxStatus.Unknown ? swap.source : undefined,
        maybeChainflipSwapId: `${swap.metadata.chainflipSwapId}`,
        ...(swap.swapperName === SwapperName.CowSwap ? { tradeId: txHash } : { txId: txHash }),
        ...(swap.metadata.relayerTxHash && {
          isRelayer: true,
          relayerExplorerTxLink: swap.metadata.relayerExplorerTxLink,
        }),
      })

      const serializedTxIndex = (() => {
        if (!swap) return

        const { buyAccountId } = swap

        if (!buyAccountId || !buyTxHash) return

        const accountAddress = fromAccountId(buyAccountId).account

        return serializeTxIndex(buyAccountId, buyTxHash, accountAddress)
      })()

      const tx = selectTxById(store.getState(), serializedTxIndex ?? '')

      const actualBuyAmountCryptoPrecision = (() => {
        if (!tx?.transfers?.length || !swap?.buyAsset) return undefined

        const receiveTransfer = tx.transfers.find(
          transfer =>
            transfer.type === TransferType.Receive && transfer.assetId === swap.buyAsset.assetId,
        )
        return receiveTransfer?.value
          ? fromBaseUnit(receiveTransfer.value, swap.buyAsset.precision)
          : undefined
      })()

      const firstHopAllowanceApproval = selectHopExecutionMetadata(store.getState(), {
        tradeId: swap.metadata.quoteId,
        hopIndex: swap.metadata.stepIndex,
      })?.allowanceApproval

      if (status === TxStatus.Confirmed) {
        // TEMP HACK FOR BASE
        if (swap.sellAsset.chainId === baseChainId || swap.buyAsset.chainId === baseChainId) {
          fetchBasePortfolio()
          upsertBasePortfolio({ accountId: swap.sellAccountId, assetId: swap.sellAsset.assetId })
          upsertBasePortfolio({ accountId: swap.buyAccountId, assetId: swap.buyAsset.assetId })
        }

        vibrate('heavy')
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            swapMetadata: {
              swapId: swap.id,
              allowanceApproval: firstHopAllowanceApproval,
            },
            status:
              swap.swapperName === SwapperName.ArbitrumBridge &&
              swap.buyAsset.chainId === ethChainId
                ? ActionStatus.Initiated
                : ActionStatus.Complete,
          }),
        )

        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            actualBuyAmountCryptoPrecision,
            status: SwapStatus.Success,
            statusMessage: message,
            buyTxHash,
            txLink,
          }),
        )

        toast({
          status: 'success',
          render: ({ title, status, description, onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <SwapNotification
                // eslint-disable-next-line react-memo/require-usememo
                handleClick={handleClick}
                swapId={swap.id}
                status={status}
                title={title}
                description={description}
                onClose={onClose}
                {...props}
              />
            )
          },
          position:
            isMobile &&
            !hasSeenRatingModal &&
            mobileFeaturesCompatibility[MobileFeature.RatingModal].isCompatible
              ? 'top'
              : 'bottom-right',
        })

        if (
          !hasSeenRatingModal &&
          mobileFeaturesCompatibility[MobileFeature.RatingModal].isCompatible
        ) {
          openRatingModal({})
          handleHasSeenRatingModal()
        }

        return
      }

      if (status === TxStatus.Failed) {
        // TEMP HACK FOR BASE
        if (swap.sellAsset.chainId === baseChainId || swap.buyAsset.chainId === baseChainId) {
          fetchBasePortfolio()
        }

        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Failed,
            swapMetadata: {
              swapId: swap.id,
            },
          }),
        )
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            status: SwapStatus.Failed,
            statusMessage: message,
            buyTxHash,
            txLink,
          }),
        )

        toast({
          status: 'error',
          render: ({ title, status, description, onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <SwapNotification
                // eslint-disable-next-line react-memo/require-usememo
                handleClick={handleClick}
                swapId={swap.id}
                status={status}
                title={title}
                description={description}
                onClose={onClose}
                {...props}
              />
            )
          },
        })
      }

      if (status === TxStatus.Pending || status === TxStatus.Unknown) {
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            statusMessage: message,
            buyTxHash,
            txLink: txLink === '' ? undefined : txLink,
          }),
        )
      }

      return {
        status,
        message,
        buyTxHash,
      }
    },
    [
      dispatch,
      toast,
      openActionCenter,
      hasSeenRatingModal,
      openRatingModal,
      handleHasSeenRatingModal,
      mobileFeaturesCompatibility,
      fetchBasePortfolio,
      upsertBasePortfolio,
    ],
  )

  // Update actions status when swap is confirmed or failed
  const actionsQueries = useMemo(() => {
    return pendingSwapActions
      .map(action => {
        const swapId = action.swapMetadata.swapId

        const swap = swapsById[swapId]

        return {
          queryKey: ['action', action.id, swap.id, swap.sellTxHash],
          queryFn: () => swapStatusHandler(swap, action),
          refetchInterval: TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
          enabled: isConnected && swap.status === SwapStatus.Pending,
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== undefined)
  }, [pendingSwapActions, isConnected, swapsById, swapStatusHandler])

  useQueries({
    queries: actionsQueries,
  })
}
