import { TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import { useTranslate } from 'react-polyglot'

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

  // const notifications = useAppSelector(selectPendingNotificationsWithoutRelatedSuccessOrError)

  // const relatedNotificationsByNotificationId = useAppSelector(
  //   selectRelatedNotificationsByNotificationId,
  // )

  // const queries = useQueries({
  //   queries: notifications.map(notification => ({
  //     queryKey: [
  //       'notificationsPolling',
  //       notification,
  //       relatedNotificationsByNotificationId[notification.id],
  //     ],
  //     queryFn: () => {
  //       switch (notification.type) {
  //         case NotificationType.Send:
  //           if (!notification.txIds?.length) return null
  //           if (relatedNotificationsByNotificationId[notification.id].length) return null

  //           const relatedTx = selectTxById(store.getState(), notification.txIds[0])

  //           if (!relatedTx) return null

  //           if (relatedTx.status === TxStatus.Pending) return null

  //           const asset = selectAssetById(store.getState(), relatedTx.transfers[0].assetId)

  //           if (!asset) return null

  //           const newNotification = {
  //             type: NotificationType.Send,
  //             assetIds: [relatedTx.transfers[0].assetId],
  //             status:
  //               relatedTx.status === TxStatus.Failed
  //                 ? NotificationStatus.Failed
  //                 : NotificationStatus.Complete,
  //             title: translate(
  //               relatedTx.status === TxStatus.Failed
  //                 ? 'notificationCenter.notificationsTitles.send.failed'
  //                 : 'notificationCenter.notificationsTitles.send.confirmed',
  //               {
  //                 amount: fromBaseUnit(relatedTx.transfers[0].value, asset.precision),
  //                 symbol: asset.symbol,
  //               },
  //             ),
  //             relatedNotificationIds: [notification.id],
  //           }

  //           console.log({ newNotification })

  //           // dispatch(notificationCenterSlice.actions.upsertNotification(newNotification))

  //           return true
  //         case NotificationType.Claim:
  //         case NotificationType.Swap:
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
