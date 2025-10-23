import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import { SolanaLogsError } from '@shapeshiftoss/swapper'
import camelCase from 'lodash/camelCase'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { InlineCopyButton } from '@/components/InlineCopyButton'
import { RawText } from '@/components/Text'
import { useNotificationToast } from '@/hooks/useNotificationToast'

const defaultErrorMsgTranslation = 'common.generalError'

export const useErrorToast = () => {
  const toast = useNotificationToast()
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

        if (error instanceof ChainAdapterError) {
          return translate(error.metadata.translation, error.metadata.options)
        }

        if (errorMsgTranslation) {
          return translate(errorMsgTranslation, errorMsgTranslationOptions)
        }

        return translate(defaultErrorMsgTranslation)
      })()

      console.error(error)

      toast({
        title: translate('trade.errors.title'),
        description: (
          <InlineCopyButton value={description}>
            <RawText>{description}</RawText>
          </InlineCopyButton>
        ),
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
