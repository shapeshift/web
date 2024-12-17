import { useToast } from '@chakra-ui/react'
import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText } from 'components/Text'

const defaultErrorMsgTranslation = 'common.generalError'

export const useErrorToast = () => {
  const toast = useToast()
  const translate = useTranslate()

  const showErrorToast = useCallback(
    (
      error: unknown,
      errorMsgTranslation?: string,
      errorMsgTranslationOptions?: InterpolationOptions,
    ) => {
      const translationArgs = (() => {
        // Chain adapter errors take priority
        if (error instanceof ChainAdapterError) {
          return [error.metadata.translation, error.metadata.options]
        }

        // If we specified an error translation, use it
        if (errorMsgTranslation) {
          return [errorMsgTranslation, errorMsgTranslationOptions]
        }

        return [defaultErrorMsgTranslation]
      })()

      const description = translate(...translationArgs)

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
        position: 'top-right',
      })
    },
    [toast, translate],
  )

  return {
    showErrorToast,
  }
}
