import { useToast } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

const defaultErrorMsgTranslation = 'common.generalError'

export const useErrorHandler = () => {
  const toast = useToast()
  const translate = useTranslate()

  const showErrorToast = useCallback(
    (
      error: unknown,
      errorMsgTranslation = defaultErrorMsgTranslation,
      errorMsgTranslationOptions?: InterpolationOptions,
    ) => {
      const description = translate(errorMsgTranslation, errorMsgTranslationOptions)

      console.error(error)

      toast({
        title: translate('trade.errors.title'),
        description,
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
