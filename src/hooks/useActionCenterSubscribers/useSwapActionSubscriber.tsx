import { usePrevious } from '@chakra-ui/react'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import {
  fetchSafeTransactionInfo,
  SwapperName,
  swappers,
  SwapStatus,
  TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
  TransactionExecutionState,
} from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries, useQuery } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { detectIncognito } from 'detectincognitojs'
import { useCallback, useEffect, useMemo } from 'react'

import { preferences } from '../../state/slices/preferencesSlice/preferencesSlice'
import { fetchIsSmartContractAddressQuery } from '../useIsSmartContractAddress/useIsSmartContractAddress'
import { MobileFeature, useMobileFeaturesCompatibility } from '../useMobileFeaturesCompatibility'
import { useModal } from '../useModal/useModal'
import { useNotificationToast } from '../useNotificationToast'
import { useWallet } from '../useWallet/useWallet'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { SwapNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification'
import { getConfig } from '@/config'
import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { getTxLink } from '@/lib/getTxLink'
import { fetchTradeStatus, tradeStatusQueryKey } from '@/lib/tradeExecution'
import { vibrate } from '@/lib/vibrate'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  selectPendingSwapActions,
  selectSwapActionBySwapId,
} from '@/state/slices/actionSlice/selectors'
import { ActionStatus, ActionType, isSwapAction } from '@/state/slices/actionSlice/types'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { selectConfirmedTradeExecution } from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { txHistory } from '@/state/slices/txHistorySlice/txHistorySlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const swapStatusToActionStatus = {
  [SwapStatus.Pending]: ActionStatus.Pending,
  [SwapStatus.Success]: ActionStatus.Complete,
  [SwapStatus.Failed]: ActionStatus.Failed,
}

const getActionStatusFromSwap = (
  swap: Swap,
  approvalState?: TransactionExecutionState,
  isApprovalRequired?: boolean,
  isActiveSwap: boolean = true,
): ActionStatus => {
  // Special handling for ArbitrumBridge - Success means withdrawal initiated, not complete
  if (
    swap.status === SwapStatus.Success &&
    swap.swapperName === SwapperName.ArbitrumBridge &&
    swap.buyAsset.chainId === ethChainId
  ) {
    return ActionStatus.Initiated
  }

  // If swap is pending/success/failed, use direct mapping
  if (swap.status !== SwapStatus.Idle) {
    return swapStatusToActionStatus[swap.status]
  }

  // For idle swaps, check approval state
  const status =
    isApprovalRequired && approvalState !== TransactionExecutionState.Complete
      ? ActionStatus.AwaitingApproval
      : ActionStatus.AwaitingSwap

  // Non-active swaps should not be in AwaitingApproval or AwaitingSwap states
  if (
    !isActiveSwap &&
    (status === ActionStatus.AwaitingApproval || status === ActionStatus.AwaitingSwap)
  ) {
    return ActionStatus.Abandoned
  }

  return status
}

export const useSwapActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const hasSeenRatingModal = useAppSelector(preferences.selectors.selectHasSeenRatingModal)
  const { open: openRatingModal } = useModal('rating')
  const mobileFeaturesCompatibility = useMobileFeaturesCompatibility()
  const confirmedTradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const isAppRatingEnabled = useFeatureFlag('AppRating')

  const { data: isIncognitoQueryData, isLoading: isIncognitoLoading } = useQuery({
    queryKey: ['isIncognito'],
    queryFn: () => detectIncognito(),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const isIncognito = useMemo(
    () => isIncognitoQueryData?.isPrivate ?? false,
    [isIncognitoQueryData],
  )

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
  const tradeQuoteState = useAppSelector(tradeQuoteSlice.selectSlice)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  // Sync swap status with action status
  useEffect(() => {
    Object.values(swapsById).forEach(swap => {
      if (!swap) return

      const swapAction = selectSwapActionBySwapId(store.getState(), {
        swapId: swap.id,
      })

      // Skip if action is already in terminal state
      if (
        swapAction?.status === ActionStatus.Complete ||
        swapAction?.status === ActionStatus.Failed
      ) {
        return
      }

      const isActiveSwap = swap.id === activeSwapId

      // Get approval metadata only for active swap
      const approvalMetadata = isActiveSwap
        ? confirmedTradeExecution?.firstHop?.allowanceApproval
        : undefined
      const isPermit2Required = confirmedTradeExecution?.firstHop?.permit2?.isRequired

      // Calculate the correct action status
      const targetStatus = getActionStatusFromSwap(
        swap,
        approvalMetadata?.state,
        approvalMetadata?.isRequired,
        isActiveSwap,
      )

      // Create new action if it doesn't exist
      if (!swapAction) {
        dispatch(
          actionSlice.actions.upsertAction({
            id: uuidv4(),
            createdAt: swap.createdAt,
            updatedAt: swap.updatedAt,
            type: ActionType.Swap,
            status: targetStatus,
            swapMetadata: {
              swapId: swap.id,
              allowanceApproval: approvalMetadata,
              isPermit2Required,
            },
          }),
        )
      } else if (isSwapAction(swapAction) && swapAction.status !== targetStatus) {
        // Update existing action if status changed
        dispatch(
          actionSlice.actions.upsertAction({
            ...swapAction,
            updatedAt: Date.now(),
            status: targetStatus,
            swapMetadata: {
              swapId: swapAction.swapMetadata.swapId,
              allowanceApproval: approvalMetadata,
              isPermit2Required,
            },
          }),
        )
      }
    })
  }, [dispatch, activeSwapId, swapsById, confirmedTradeExecution])

  const swapStatusHandler = useCallback(
    async (swap: Swap | undefined) => {
      if (!swap) return

      const maybeSwapper = swappers[swap.swapperName]

      if (maybeSwapper === undefined)
        throw new Error(`no swapper matching swapperName '${swap.swapperName}'`)

      const swapper = maybeSwapper

      if (!swap.sellTxHash) return
      if (!swap.receiveAddress) return

      const { status, message, buyTxHash, actualBuyAmountCryptoBaseUnit } =
        await queryClient.fetchQuery({
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
        maybeNearIntentsDepositAddress: swap.metadata.nearIntentsSpecific?.depositAddress,
        ...(swap.swapperName === SwapperName.CowSwap ? { tradeId: txHash } : { txId: txHash }),
        ...(swap.metadata.relayerTxHash && {
          isRelayer: true,
          relayerExplorerTxLink: swap.metadata.relayerExplorerTxLink,
        }),
      })

      if (status === TxStatus.Confirmed) {
        vibrate('heavy')

        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            status: SwapStatus.Success,
            statusMessage: message,
            buyTxHash,
            txLink,
            actualBuyAmountCryptoBaseUnit,
          }),
        )

        // Parse and upsert Txs for second-class chains
        const sellChainId = fromAccountId(swap.sellAccountId).chainId
        const isSellSecondClassChain = SECOND_CLASS_CHAINS.includes(sellChainId as KnownChainIds)

        if (isSellSecondClassChain && swap.sellTxHash) {
          try {
            const adapter = getChainAdapterManager().get(sellChainId)
            const { account: sellAddress } = fromAccountId(swap.sellAccountId)
            if (adapter?.parseTx) {
              const parsedSellTx = await adapter.parseTx(swap.sellTxHash, sellAddress)
              dispatch(
                txHistory.actions.onMessage({
                  message: parsedSellTx,
                  accountId: swap.sellAccountId,
                }),
              )
            }
          } catch (error) {
            console.error('Failed to parse and upsert sell Tx:', error)
          }
        }

        if (buyTxHash && swap.buyAccountId) {
          const buyChainId = fromAccountId(swap.buyAccountId).chainId
          const isBuySecondClassChain = SECOND_CLASS_CHAINS.includes(buyChainId as KnownChainIds)

          if (isBuySecondClassChain) {
            try {
              const adapter = getChainAdapterManager().get(buyChainId)
              const { account: buyAddress } = fromAccountId(swap.buyAccountId)
              if (adapter?.parseTx) {
                const parsedBuyTx = await adapter.parseTx(buyTxHash, buyAddress)
                dispatch(
                  txHistory.actions.onMessage({
                    message: parsedBuyTx,
                    accountId: swap.buyAccountId,
                  }),
                )
              }
            } catch (error) {
              console.error('Failed to parse and upsert buy Tx:', error)
            }
          }
        }

        const { getAccount } = portfolioApi.endpoints

        if (isSellSecondClassChain) {
          dispatch(
            getAccount.initiate(
              { accountId: swap.sellAccountId, upsertOnFetch: true },
              { forceRefetch: true },
            ),
          )
        }

        if (swap.buyAccountId && swap.buyAccountId !== swap.sellAccountId) {
          const buyChainId = fromAccountId(swap.buyAccountId).chainId
          const isBuySecondClassChain = SECOND_CLASS_CHAINS.includes(buyChainId as KnownChainIds)

          if (isBuySecondClassChain) {
            dispatch(
              getAccount.initiate(
                { accountId: swap.buyAccountId, upsertOnFetch: true },
                { forceRefetch: true },
              ),
            )
          }
        }

        if (
          !hasSeenRatingModal &&
          mobileFeaturesCompatibility[MobileFeature.RatingModal].isCompatible &&
          !isIncognito &&
          !isIncognitoLoading &&
          isAppRatingEnabled
        ) {
          openRatingModal({})
          handleHasSeenRatingModal()
        }

        if (toast.isActive(swap.id)) return

        toast({
          status: 'success',
          render: ({ title, status, description, onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <SwapNotification
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

        return
      }

      if (status === TxStatus.Failed) {
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            status: SwapStatus.Failed,
            statusMessage: message,
            buyTxHash,
            txLink,
          }),
        )

        if (toast.isActive(swap.id)) return

        toast({
          status: 'error',
          render: ({ title, status, description, onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <SwapNotification
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
    // we explicitly want to be reactive on the tradeQuote slice here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dispatch,
      toast,
      openActionCenter,
      hasSeenRatingModal,
      openRatingModal,
      handleHasSeenRatingModal,
      mobileFeaturesCompatibility,
      tradeQuoteState,
      isIncognito,
    ],
  )

  // Update actions status when swap is confirmed or failed
  const actionsQueries = useMemo(() => {
    return pendingSwapActions
      .map(action => {
        const swapId = action.swapMetadata.swapId

        const swap = swapsById[swapId]

        return {
          queryKey: ['action', action.id, swap?.id, swap?.sellTxHash],
          queryFn: () => swapStatusHandler(swap),
          refetchInterval: TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
          enabled: isConnected && swap?.status === SwapStatus.Pending,
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== undefined)
  }, [pendingSwapActions, isConnected, swapsById, swapStatusHandler])

  useQueries({
    queries: actionsQueries,
  })
}
