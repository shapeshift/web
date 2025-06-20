import { usePrevious, useToast } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import {
  fetchSafeTransactionInfo,
  swappers,
  SwapStatus,
  TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
} from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { fetchIsSmartContractAddressQuery } from '../useIsSmartContractAddress/useIsSmartContractAddress'
import { useWallet } from '../useWallet/useWallet'

import { SwapNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification'
import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { getTxLink } from '@/lib/getTxLink'
import { fetchTradeStatus, tradeStatusQueryKey } from '@/lib/tradeExecution'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  selectPendingSwapActions,
  selectSwapActionBySwapId,
} from '@/state/slices/actionSlice/selectors'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type UseSwapActionSubscriberProps = {
  onDrawerOpen: () => void
}

export const useSwapActionSubscriber = ({ onDrawerOpen }: UseSwapActionSubscriberProps) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const toast = useToast({
    duration: null,
    position: 'bottom-right',
  })

  const pendingSwapActions = useAppSelector(selectPendingSwapActions)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const {
    state: { isConnected },
  } = useWallet()
  const activeSwapId = useAppSelector(swapSlice.selectors.selectActiveSwapId)
  const previousSwapStatus = usePrevious(activeSwapId ? swapsById[activeSwapId]?.status : undefined)

  // Create swap and action after user confirmed the intent
  useEffect(() => {
    if (!activeSwapId) return

    const activeSwap = swapsById[activeSwapId]

    if (!activeSwap) return

    if (activeSwap.status !== SwapStatus.Pending) return
    if (previousSwapStatus === activeSwap.status) return

    const existingSwapAction = selectSwapActionBySwapId(store.getState(), {
      swapId: activeSwap.id,
    })

    if (existingSwapAction) return

    dispatch(
      actionSlice.actions.upsertAction({
        id: uuidv4(),
        createdAt: activeSwap.createdAt,
        updatedAt: activeSwap.updatedAt,
        type: ActionType.Swap,
        status: ActionStatus.Pending,
        swapMetadata: {
          swapId: activeSwap.id,
        },
      }),
    )
  }, [dispatch, translate, activeSwapId, swapsById, previousSwapStatus])

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

      if (!buyTxHash) return

      const swapBuyAsset = swap.buyAsset

      if (status === TxStatus.Confirmed) {
        const feeAsset = selectFeeAssetByChainId(store.getState(), swapBuyAsset.chainId)

        const maybeSafeTx = await fetchSafeTransactionInfo({
          address: swap.receiveAddress,
          chainId: swapBuyAsset.chainId,
          safeTxHash: buyTxHash,
          fetchIsSmartContractAddressQuery,
        })

        const txLink = getTxLink({
          defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
          txId: buyTxHash,
          maybeSafeTx,
          address: swap.receiveAddress,
          chainId: swapBuyAsset.chainId,
        })

        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            swapMetadata: {
              swapId: swap.id,
            },
            status: ActionStatus.Complete,
          }),
        )
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
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
              onDrawerOpen()
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
        return
      }

      if (status === TxStatus.Failed) {
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
          }),
        )

        toast({
          status: 'error',
          render: ({ title, status, description, onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              onDrawerOpen()
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
          }),
        )
      }

      return {
        status,
        message,
        buyTxHash,
      }
    },
    [dispatch, toast, onDrawerOpen],
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
