import { useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

export const useErrorHandler = () => {
  const toast = useToast()
  const translate = useTranslate()

  const showErrorToast = useCallback(
    (error: unknown) => {
      const description = translate('common.generalError')

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
