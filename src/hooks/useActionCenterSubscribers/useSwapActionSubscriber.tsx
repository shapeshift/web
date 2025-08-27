import { usePrevious } from '@chakra-ui/react'
import { baseChainId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import {
  fetchSafeTransactionInfo,
  SwapperName,
  swappers,
  SwapStatus,
  TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
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
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectTxById } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { selectHopExecutionMetadata } from '@/state/slices/tradeQuoteSlice/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useSwapActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const hasSeenRatingModal = useAppSelector(preferences.selectors.selectHasSeenRatingModal)
  const { open: openRatingModal } = useModal('rating')
  const mobileFeaturesCompatibility = useMobileFeaturesCompatibility()

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
  const previousSwapStatus = usePrevious(activeSwapId ? swapsById[activeSwapId]?.status : undefined)
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  const { fetchBasePortfolio, upsertBasePortfolio } = useBasePortfolioManagement()

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  // Create swap and action after user confirmed the intent
  useEffect(() => {
    if (!activeSwapId) return

    const activeSwap = swapsById[activeSwapId]

    if (!activeSwap) return

    const firstHopAllowanceApproval = selectHopExecutionMetadata(store.getState(), {
      tradeId: activeSwap.metadata.quoteId,
      hopIndex: activeSwap.metadata.stepIndex,
    })?.allowanceApproval

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
          allowanceApproval: firstHopAllowanceApproval,
        },
      }),
    )
  }, [dispatch, activeSwapId, swapsById, previousSwapStatus])

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
