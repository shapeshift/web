import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import type { SendInput } from '../../Form'
import { handleSend } from '../../utils'

import { InlineCopyButton } from '@/components/InlineCopyButton'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { notificationCenterSlice } from '@/state/slices/notificationSlice/notificationSlice'
import type { NotificationPayload } from '@/state/slices/notificationSlice/types'
import { NotificationStatus, NotificationType } from '@/state/slices/notificationSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { store, useAppDispatch } from '@/state/store'

export const useFormSend = () => {
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()
  const dispatch = useAppDispatch()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const handleFormSend = useCallback(
    async (sendInput: SendInput, toastOnBroadcast: boolean): Promise<string | undefined> => {
      try {
        const asset = selectAssetById(store.getState(), sendInput.assetId)
        if (!asset) throw new Error(`No asset found for assetId ${sendInput.assetId}`)
        if (!wallet) throw new Error('No wallet connected')

        const broadcastTXID = await handleSend({ wallet, sendInput })

        const notification: NotificationPayload = {
          title: translate('notificationCenter.notificationsTitles.send.pending', {
            amountAndSymbol: toCrypto(
              fromBaseUnit(sendInput.amountCryptoPrecision, asset.precision),
              asset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
          }),
          type: NotificationType.Send,
          status: NotificationStatus.Pending,
          txIds: [serializeTxIndex(sendInput.accountId, broadcastTXID, sendInput.input)],
          assetIds: [sendInput.assetId],
          relatedNotificationIds: [],
        }

        dispatch(notificationCenterSlice.actions.upsertNotification(notification))

        setTimeout(() => {
          if (!toastOnBroadcast) return

          toast({
            title: translate('modals.send.sent', { asset: asset.name }),
            description: (
              <Text>
                <Text>
                  {translate('modals.send.youHaveSent', {
                    amount: sendInput.amountCryptoPrecision,
                    symbol: asset.symbol,
                  })}
                </Text>
                {asset.explorerTxLink && (
                  <Link href={`${asset.explorerTxLink}${broadcastTXID}`} isExternal>
                    {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
                  </Link>
                )}
              </Text>
            ),
            status: 'success',
            duration: 9000,
            isClosable: true,
            position: 'top-right',
          })
        }, 5000)

        return broadcastTXID
      } catch (e) {
        const asset = selectAssetById(store.getState(), sendInput.assetId)
        console.error(e)

        const translation =
          e instanceof ChainAdapterError
            ? translate(e.metadata.translation, e.metadata.options)
            : translate('modals.send.errors.transactionRejected')

        toast({
          title: asset
            ? translate('modals.send.errorTitle', {
                asset: asset.name,
              })
            : translate('common.error'),
          description: (
            <InlineCopyButton value={translation}>
              <RawText>{translation}</RawText>
            </InlineCopyButton>
          ),
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top-right',
        })

        return ''
      }
    },
    [toast, translate, wallet, dispatch, toCrypto],
  )

  return {
    handleFormSend,
  }
}
