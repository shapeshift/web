import { HDWalletErrorType } from '@shapeshiftoss/hdwallet-core'
import { upperFirst } from 'lodash'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { FailureType } from '@/context/WalletProvider/KeepKey/KeepKeyTypes'
import { useNotificationToast } from '@/hooks/useNotificationToast'

const CANCELLED_FAILURE_TYPES = [FailureType.ACTIONCANCELLED, FailureType.PINCANCELLED]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// The app-side cancel throws ActionCancelled, a device-side one rethrows a raw failure response
const isCancelled = (e: unknown): boolean => {
  if (!isRecord(e)) return false
  if (e.name === HDWalletErrorType.ActionCancelled) return true
  if (!isRecord(e.message)) return false

  const { code } = e.message

  return typeof code === 'number' && CANCELLED_FAILURE_TYPES.includes(code)
}

// KeepKey rejections carry a { code, message } object where an Error would carry a string
const getErrorMessage = (e: unknown): string | undefined => {
  if (!isRecord(e)) return undefined

  const { message } = e

  if (typeof message === 'string') return message
  if (!isRecord(message)) return undefined

  return typeof message.message === 'string' ? message.message : undefined
}

// Toasting from the awaited call, so the outcome survives the device prompt closing the panel
export const useDeviceSettingToast = (setting: string) => {
  const translate = useTranslate()
  const toast = useNotificationToast()

  const toastSuccess = useCallback(
    (title?: string) =>
      toast({
        title:
          title ??
          translate('walletProvider.keepKey.settings.descriptions.updateSuccess', {
            setting: upperFirst(setting),
          }),
        status: 'success',
        isClosable: true,
      }),
    [setting, toast, translate],
  )

  const toastError = useCallback(
    (e: unknown) => {
      console.error(e)
      // Cancelling is the user getting what they asked for, not a failure
      if (isCancelled(e)) return

      toast({
        title: translate('walletProvider.keepKey.settings.descriptions.updateFailed', {
          setting: upperFirst(setting),
        }),
        description: getErrorMessage(e) ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    },
    [setting, toast, translate],
  )

  return { toastSuccess, toastError }
}
