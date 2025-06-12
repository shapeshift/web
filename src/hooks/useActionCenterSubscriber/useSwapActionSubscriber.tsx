import { usePrevious, useToast } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Swap } from '@shapeshiftoss/swapper'
import { fetchSafeTransactionInfo, swappers, SwapStatus } from '@shapeshiftoss/swapper'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { fetchIsSmartContractAddressQuery } from '../useIsSmartContractAddress/useIsSmartContractAddress'
import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '../useWallet/useWallet'

import { SwapNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification'
import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getTxLink } from '@/lib/getTxLink'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  selectPendingSwapActions,
  selectSwapActionBySwapId,
} from '@/state/slices/actionSlice/selectors'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectFeeAssetByChainId, selectTxById } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type UseSwapActionSubscriberProps = {
  onDrawerOpen: () => void
}

export const useSwapActionSubscriber = ({ onDrawerOpen }: UseSwapActionSubscriberProps) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const toast = useToast({
    render: ({ title, status, description, onClose, ...props }) => {
      const handleClick = () => {
        onClose()
        onDrawerOpen()
      }

      return (
        <SwapNotification
          // eslint-disable-next-line react-memo/require-usememo
          handleClick={handleClick}
          status={status}
          title={title}
          description={description}
          onClose={onClose}
          {...props}
        />
      )
    },
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
        title: translate('notificationCenter.swapTitle', {
          sellAmountAndSymbol: toCrypto(
            fromBaseUnit(activeSwap.sellAmountCryptoBaseUnit, activeSwap.sellAsset.precision),
            activeSwap.sellAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
          buyAmountAndSymbol: toCrypto(
            fromBaseUnit(activeSwap.buyAmountCryptoBaseUnit, activeSwap.buyAsset.precision),
            activeSwap.buyAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
        }),
        swapMetadata: {
          swapId: activeSwap.id,
        },
      }),
    )
  }, [dispatch, translate, toCrypto, activeSwapId, swapsById, previousSwapStatus])

  const swapStatusHandler = useCallback(
    async (swap: Swap, action: SwapAction) => {
      const maybeSwapper = swappers[swap.swapperName]

      if (maybeSwapper === undefined)
        throw new Error(`no swapper matching swapperName '${swap.swapperName}'`)

      const swapper = maybeSwapper

      if (!swap.sellAccountId) return
      if (!swap.buyAccountId) return
      if (!swap.sellTxHash) return
      if (!swap.receiveAddress) return

      const { status, message, buyTxHash } = await swapper.checkTradeStatus({
        txHash: swap.sellTxHash,
        chainId: swap.sellAsset.chainId,
        accountId: swap.sellAccountId,
        stepIndex: swap.metadata.stepIndex,
        swap,
        config: getConfig(),
        assertGetEvmChainAdapter,
        assertGetUtxoChainAdapter,
        assertGetCosmosSdkChainAdapter,
        assertGetSolanaChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (!buyTxHash) return

      const swapSellAsset = swap.sellAsset
      const swapBuyAsset = swap.buyAsset

      const txId = serializeTxIndex(swap.buyAccountId, buyTxHash, swap.receiveAddress)

      if (status === TxStatus.Confirmed) {
        const accountId = swap.sellAccountId
        const tx = await (async () => {
          const txFromTxHistory = selectTxById(store.getState(), txId)
          if (txFromTxHistory) return txFromTxHistory

          const adapter = getChainAdapterManager().get(swap.sellAsset.chainId)

          if (!adapter) return

          const tx = await (adapter as EvmChainAdapter).httpProvider.getTransaction({
            txid: buyTxHash,
          })

          const parsedTx = await adapter.parseTx(tx, fromAccountId(accountId).account)

          return parsedTx
        })()

        const feeAsset = selectFeeAssetByChainId(
          store.getState(),
          tx?.chainId ?? swapBuyAsset.chainId,
        )

        if (tx) {
          try {
            const maybeSafeTx = await fetchSafeTransactionInfo({
              accountId,
              safeTxHash: buyTxHash,
              fetchIsSmartContractAddressQuery,
            })

            const txLink = getTxLink({
              stepSource: tx.trade?.dexName,
              defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
              txId: tx.txid,
              maybeSafeTx,
              accountId,
            })

            if (tx.transfers?.length) {
              const receiveTransfer = tx.transfers.find(
                transfer =>
                  transfer.type === TransferType.Receive &&
                  transfer.assetId === swapBuyAsset.assetId,
              )

              if (receiveTransfer?.value) {
                const notificationTitle = translate('notificationCenter.swapTitle', {
                  sellAmountAndSymbol: toCrypto(
                    fromBaseUnit(swap.sellAmountCryptoBaseUnit, swapSellAsset.precision),
                    swapSellAsset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                  buyAmountAndSymbol: toCrypto(
                    fromBaseUnit(receiveTransfer.value, swapBuyAsset.precision),
                    swapBuyAsset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                })

                dispatch(
                  actionSlice.actions.upsertAction({
                    ...action,
                    title: notificationTitle,
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
                    buyAmountCryptoBaseUnit: receiveTransfer.value,
                    txLink,
                  }),
                )

                toast({
                  title: translate('notificationCenter.swapSuccess'),
                  status: 'success',
                  id: swap.id,
                  position: 'top-right',
                })
                return
              }
            }
          } catch (error) {
            console.error('Failed to fetch transaction details:', error)
            return
          }
        }

        const maybeSafeTx = await fetchSafeTransactionInfo({
          accountId,
          safeTxHash: buyTxHash,
          fetchIsSmartContractAddressQuery,
        })

        const txLink = getTxLink({
          defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
          txId: buyTxHash,
          maybeSafeTx,
          accountId,
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
            txLink,
          }),
        )
        return
      }

      if (status === TxStatus.Failed) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            title: translate('notificationCenter.swapTitle'),
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
          }),
        )

        toast({
          title: translate('notificationCenter.swapError'),
          status: 'error',
          id: swap.id,
          position: 'top-right',
        })
      }

      return {
        status,
        message,
        buyTxHash,
      }
    },
    [toCrypto, translate, toast, dispatch],
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
          refetchInterval: 10000,
          enabled: isConnected,
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== undefined)
  }, [pendingSwapActions, isConnected, swapsById, swapStatusHandler])

  useQueries({
    queries: actionsQueries,
  })
}
