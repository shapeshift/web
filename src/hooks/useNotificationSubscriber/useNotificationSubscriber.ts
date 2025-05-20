import { TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'

import { notificationCenterSlice } from '@/state/slices/notificationSlice/notificationSlice'
import {
  selectPendingNotificationsWithoutRelatedSuccessOrError,
  selectRelatedNotificationsByNotificationId,
} from '@/state/slices/notificationSlice/selectors'
import { NotificationStatus, NotificationType } from '@/state/slices/notificationSlice/types'
import { selectAssetById, selectTxById } from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useNotificationSubscriber = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const notifications = useAppSelector(selectPendingNotificationsWithoutRelatedSuccessOrError)

  const relatedNotificationsByNotificationId = useAppSelector(
    selectRelatedNotificationsByNotificationId,
  )
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  useQueries({
    queries: notifications.map(notification => ({
      queryKey: [
        'notificationsPolling',
        notification,
        relatedNotificationsByNotificationId[notification.id],
      ],
      queryFn: () => {
        switch (notification.type) {
          case NotificationType.Send: {
            if (!notification.txIds?.length) return null
            if (relatedNotificationsByNotificationId[notification.id].length) return null

            const relatedTx = selectTxById(store.getState(), notification.txIds[0])

            if (!relatedTx) return null

            if (relatedTx.status === TxStatus.Pending) return null

            const asset = selectAssetById(store.getState(), relatedTx.transfers[0].assetId)

            if (!asset) return null

            const newNotification = {
              type: NotificationType.Send,
              assetIds: relatedTx.transfers.map(transfer => transfer.assetId),
              status:
                relatedTx.status === TxStatus.Failed
                  ? NotificationStatus.Failed
                  : NotificationStatus.Complete,
              title: translate(
                relatedTx.status === TxStatus.Failed
                  ? 'notificationCenter.notificationsTitles.send.failed'
                  : 'notificationCenter.notificationsTitles.send.confirmed',
                {
                  amountAndSymbol: toCrypto(
                    fromBaseUnit(relatedTx.transfers[0].value, asset.precision),
                    asset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                },
              ),
              relatedNotificationIds: [notification.id],
            }

            dispatch(notificationCenterSlice.actions.upsertNotification(newNotification))

            return true
          }
          case NotificationType.Swap: {
            if (!notification.txIds?.length) return null
            if (relatedNotificationsByNotificationId[notification.id].length) return null

            const relatedTx = selectTxById(store.getState(), notification.txIds[0])

            if (!relatedTx) return null

            if (relatedTx.status === TxStatus.Pending) return null

            const sellAsset = selectAssetById(store.getState(), relatedTx.transfers[0].assetId)
            const buyAsset = selectAssetById(
              store.getState(),
              relatedTx.transfers[relatedTx.transfers.length - 1].assetId,
            )

            if (!sellAsset || !buyAsset) return null

            const newNotification = {
              type: NotificationType.Swap,
              assetIds: relatedTx.transfers.map(transfer => transfer.assetId),
              status:
                relatedTx.status === TxStatus.Failed
                  ? NotificationStatus.Failed
                  : NotificationStatus.Complete,
              title: translate(
                relatedTx.status === TxStatus.Failed
                  ? 'notificationCenter.notificationsTitles.swap.failed'
                  : 'notificationCenter.notificationsTitles.swap.confirmed',
                {
                  sellAmountAndSymbol: toCrypto(
                    fromBaseUnit(relatedTx.transfers[0].value, sellAsset.precision),
                    sellAsset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                  buyAmountAndSymbol: toCrypto(
                    fromBaseUnit(
                      relatedTx.transfers[relatedTx.transfers.length - 1].value,
                      buyAsset.precision,
                    ),
                    buyAsset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                },
              ),
              relatedNotificationIds: [notification.id],
            }

            dispatch(notificationCenterSlice.actions.upsertNotification(newNotification))

            return true
          }
          case NotificationType.Claim:
          default:
            return false
        }
      },
      // @TODO: to be defined
      refetchInterval: 10000,
      enabled: !relatedNotificationsByNotificationId[notification.id].length,
      retry: 0,
    })),
  })
}
