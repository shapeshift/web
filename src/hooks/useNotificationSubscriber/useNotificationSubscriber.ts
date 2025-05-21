import { usePrevious } from '@chakra-ui/react'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'
import { useTxDetails, useTxDetailsQuery } from '../useTxDetails/useTxDetails'

import { notificationCenterSlice } from '@/state/slices/notificationSlice/notificationSlice'
import { NotificationStatus, NotificationType } from '@/state/slices/notificationSlice/types'
import {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectIsActiveQuoteMultiHop,
  selectLastHopBuyAccountId,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecution,
} from '@/state/slices/tradeQuoteSlice/selectors'
import {
  TradeExecutionState,
  TransactionExecutionState,
} from '@/state/slices/tradeQuoteSlice/types'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useNotificationSubscriber = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const tradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const tradeSellAsset = useAppSelector(selectInputSellAsset)
  const tradeBuyAsset = useAppSelector(selectInputBuyAsset)
  const tradeQuote = useAppSelector(selectActiveQuote)
  const previousTradeExecutionState = usePrevious(tradeExecution?.state)
  const previousTradeQuoteId = usePrevious(tradeQuote?.id)
  const receiveAddress = tradeQuote?.receiveAddress
  const buyAccountId = useAppSelector(selectLastHopBuyAccountId)

  const isMultiHop = useAppSelector(selectIsActiveQuoteMultiHop)

  const buyTxId = useMemo(() => {
    if (!tradeExecution || !receiveAddress || !buyAccountId) return

    const txHash = isMultiHop
      ? tradeExecution.secondHop?.swap?.buyTxHash
      : tradeExecution.firstHop?.swap?.buyTxHash

    if (!txHash) return

    return serializeTxIndex(buyAccountId, txHash, receiveAddress)
  }, [tradeExecution, isMultiHop, receiveAddress, buyAccountId])

  const txTransfers = useTxDetails(buyTxId ?? '')?.transfers
  const manualReceiveAddressTransfers = useTxDetailsQuery(buyTxId ?? '')?.transfers
  const transfers = txTransfers || manualReceiveAddressTransfers

  const actualBuyAmountCryptoPrecision = useMemo(() => {
    if (!transfers?.length || !tradeBuyAsset) return undefined

    const receiveTransfer = transfers.find(
      transfer =>
        transfer.type === TransferType.Receive && transfer.assetId === tradeBuyAsset.assetId,
    )
    return receiveTransfer?.value
      ? fromBaseUnit(receiveTransfer.value, tradeBuyAsset.precision)
      : undefined
  }, [transfers, tradeBuyAsset])

  useEffect(() => {
    if (!actualBuyAmountCryptoPrecision) return
    const firstStep = tradeQuote?.steps[0]
    const lastStep = tradeQuote?.steps[tradeQuote.steps.length - 1]

    if (!firstStep || !lastStep) return

    dispatch(
      notificationCenterSlice.actions.updateNotification({
        swapId: tradeQuote?.id,
        title: translate('notificationCenter.notificationsTitles.swap.pending', {
          sellAmountAndSymbol: toCrypto(
            fromBaseUnit(
              firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
              tradeSellAsset.precision,
            ),
            tradeSellAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
          buyAmountAndSymbol: toCrypto(
            fromBaseUnit(lastStep.buyAmountAfterFeesCryptoBaseUnit, tradeBuyAsset.precision),
            tradeBuyAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
        }),
      }),
    )
  }, [
    actualBuyAmountCryptoPrecision,
    tradeQuote,
    dispatch,
    toCrypto,
    tradeBuyAsset,
    tradeSellAsset,
    translate,
  ])

  useEffect(() => {
    if (!tradeExecution) return

    const { firstHop, secondHop } = tradeExecution
    const firstStep = tradeQuote?.steps[0]
    const lastStep = tradeQuote?.steps[tradeQuote.steps.length - 1]

    if (!firstStep || !lastStep) return

    if (
      tradeQuote.quoteOrRate === 'quote' &&
      tradeExecution.state === TradeExecutionState.FirstHop &&
      (previousTradeExecutionState !== TradeExecutionState.FirstHop ||
        previousTradeQuoteId !== tradeQuote.id)
    ) {
      console.log({
        quoteId: tradeQuote.id,
      })
      dispatch(
        notificationCenterSlice.actions.upsertOrUpdateNotification({
          type: NotificationType.Swap,
          status: NotificationStatus.Pending,
          title: translate('notificationCenter.notificationsTitles.swap.pending', {
            sellAmountAndSymbol: toCrypto(
              fromBaseUnit(
                firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
                tradeSellAsset.precision,
              ),
              tradeSellAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
            buyAmountAndSymbol: toCrypto(
              fromBaseUnit(lastStep.buyAmountAfterFeesCryptoBaseUnit, tradeBuyAsset.precision),
              tradeBuyAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
          }),
          swapId: tradeQuote.id,
          assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
          relatedNotificationIds: [],
        }),
      )
    }

    if (
      tradeExecution.state === TradeExecutionState.TradeComplete &&
      previousTradeExecutionState !== TradeExecutionState.TradeComplete &&
      (previousTradeQuoteId === tradeQuote?.id || !previousTradeQuoteId)
    ) {
      dispatch(
        notificationCenterSlice.actions.upsertOrUpdateNotification({
          swapId: tradeQuote.id,
          title: translate('notificationCenter.notificationsTitles.swap.confirmed', {
            sellAmountAndSymbol: toCrypto(
              fromBaseUnit(
                firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
                tradeSellAsset.precision,
              ),
              tradeSellAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
            buyAmountAndSymbol: toCrypto(
              fromBaseUnit(lastStep.buyAmountAfterFeesCryptoBaseUnit, tradeBuyAsset.precision),
              tradeBuyAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
          }),
          type: NotificationType.Swap,
          status: NotificationStatus.Complete,
          assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
          relatedNotificationIds: [],
        }),
      )
    }

    if (
      ((firstHop.swap.state === TransactionExecutionState.Failed ||
        secondHop.swap.state === TransactionExecutionState.Failed) &&
        previousTradeQuoteId === tradeQuote?.id) ||
      !previousTradeQuoteId
    ) {
      console.log('trade failed', {
        swapId: tradeQuote.id,
        firstHop,
        secondHop,
      })
      dispatch(
        notificationCenterSlice.actions.upsertOrUpdateNotification({
          swapId: tradeQuote.id,
          title: translate('notificationCenter.notificationsTitles.swap.failed'),
          type: NotificationType.Swap,
          status: NotificationStatus.Failed,
          assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
          relatedNotificationIds: [],
        }),
      )
    }
  }, [
    tradeExecution,
    dispatch,
    translate,
    toCrypto,
    tradeSellAsset,
    tradeBuyAsset,
    tradeQuote,
    previousTradeExecutionState,
    previousTradeQuoteId,
  ])

  // useQueries({
  //   queries: notifications.map(notification => ({
  //     queryKey: [
  //       'notificationsPolling',
  //       notification,
  //       relatedNotificationsByNotificationId[notification.id],
  //     ],
  //     queryFn: () => {
  //       switch (notification.type) {
  //         case NotificationType.Send: {
  //           if (!notification.txIds?.length) return null
  //           if (relatedNotificationsByNotificationId[notification.id].length) return null

  //           const relatedTx = selectTxById(store.getState(), notification.txIds[0])

  //           if (!relatedTx) return null

  //           if (relatedTx.status === TxStatus.Pending) return null

  //           const asset = selectAssetById(store.getState(), relatedTx.transfers[0].assetId)

  //           if (!asset) return null

  //           const newNotification = {
  //             type: NotificationType.Send,
  //             assetIds: relatedTx.transfers.map(transfer => transfer.assetId),
  //             status:
  //               relatedTx.status === TxStatus.Failed
  //                 ? NotificationStatus.Failed
  //                 : NotificationStatus.Complete,
  //             title: translate(
  //               relatedTx.status === TxStatus.Failed
  //                 ? 'notificationCenter.notificationsTitles.send.failed'
  //                 : 'notificationCenter.notificationsTitles.send.confirmed',
  //               {
  //                 amountAndSymbol: toCrypto(
  //                   fromBaseUnit(relatedTx.transfers[0].value, asset.precision),
  //                   asset.symbol,
  //                   {
  //                     maximumFractionDigits: 8,
  //                     omitDecimalTrailingZeros: true,
  //                     abbreviated: true,
  //                     truncateLargeNumbers: true,
  //                   },
  //                 ),
  //               },
  //             ),
  //             relatedNotificationIds: [notification.id],
  //           }

  //           dispatch(notificationCenterSlice.actions.upsertNotification(newNotification))

  //           return true
  //         }
  //         case NotificationType.Swap: {
  //           if (!notification.txIds?.length) return null
  //           if (relatedNotificationsByNotificationId[notification.id].length) return null

  //           const relatedTx = selectTxById(store.getState(), notification.txIds[0])

  //           if (!relatedTx) return null

  //           if (relatedTx.status === TxStatus.Pending) return null

  //           const sellAsset = selectAssetById(store.getState(), relatedTx.transfers[0].assetId)
  //           const buyAsset = selectAssetById(
  //             store.getState(),
  //             relatedTx.transfers[relatedTx.transfers.length - 1].assetId,
  //           )

  //           if (!sellAsset || !buyAsset) return null

  //           const newNotification = {
  //             type: NotificationType.Swap,
  //             assetIds: relatedTx.transfers.map(transfer => transfer.assetId),
  //             status:
  //               relatedTx.status === TxStatus.Failed
  //                 ? NotificationStatus.Failed
  //                 : NotificationStatus.Complete,
  //             title: translate(
  //               relatedTx.status === TxStatus.Failed
  //                 ? 'notificationCenter.notificationsTitles.swap.failed'
  //                 : 'notificationCenter.notificationsTitles.swap.confirmed',
  //               {
  //                 sellAmountAndSymbol: toCrypto(
  //                   fromBaseUnit(relatedTx.transfers[0].value, sellAsset.precision),
  //                   sellAsset.symbol,
  //                   {
  //                     maximumFractionDigits: 8,
  //                     omitDecimalTrailingZeros: true,
  //                     abbreviated: true,
  //                     truncateLargeNumbers: true,
  //                   },
  //                 ),
  //                 buyAmountAndSymbol: toCrypto(
  //                   fromBaseUnit(
  //                     relatedTx.transfers[relatedTx.transfers.length - 1].value,
  //                     buyAsset.precision,
  //                   ),
  //                   buyAsset.symbol,
  //                   {
  //                     maximumFractionDigits: 8,
  //                     omitDecimalTrailingZeros: true,
  //                     abbreviated: true,
  //                     truncateLargeNumbers: true,
  //                   },
  //                 ),
  //               },
  //             ),
  //             relatedNotificationIds: [notification.id],
  //           }

  //           dispatch(notificationCenterSlice.actions.upsertNotification(newNotification))

  //           return true
  //         }
  //         case NotificationType.Claim:
  //         default:
  //           return false
  //       }
  //     },
  //     // @TODO: to be defined
  //     refetchInterval: 10000,
  //     enabled: !relatedNotificationsByNotificationId[notification.id].length,
  //     retry: 0,
  //   })),
  // })
}
