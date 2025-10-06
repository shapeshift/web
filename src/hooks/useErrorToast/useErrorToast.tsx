import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import { SolanaLogsError } from '@shapeshiftoss/swapper'
import camelCase from 'lodash/camelCase'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { useNotificationToast } from '@/hooks/useNotificationToast'

const defaultErrorMsgTranslation = 'common.generalError'

export const useErrorToast = () => {
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const translate = useTranslate()

  const showErrorToast = useCallback(
    (
      error: unknown,
      errorMsgTranslation?: string,
      errorMsgTranslationOptions?: InterpolationOptions,
    ) => {
      const description = (() => {
        if (error instanceof SolanaLogsError) {
          return translate(`trade.errors.${camelCase(error.name)}`)
        }

        // Chain adapter errors take priority
        if (error instanceof ChainAdapterError) {
          return translate(error.metadata.translation, error.metadata.options)
        }

        // If we specified an error translation, use it
        if (errorMsgTranslation) {
          return translate(errorMsgTranslation, errorMsgTranslationOptions)
        }

        return translate(defaultErrorMsgTranslation)
      })()

      console.error(error)

      toast({
        title: description,
        description: translate('trade.errors.title'),
        status: 'error',
        duration: 9000,
        isClosable: true,
      })
    },
    [toast, translate],
  )

  return {
    showErrorToast,
  }
}
