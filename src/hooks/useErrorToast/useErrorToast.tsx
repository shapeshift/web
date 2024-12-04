import { useToast } from '@chakra-ui/react'
import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText } from 'components/Text'

export const useErrorHandler = () => {
  const toast = useToast()
  const translate = useTranslate()

  const showErrorToast = useCallback(
    (error: unknown) => {
      const description =
        error instanceof ChainAdapterError
          ? translate(error.metadata.translation, error.metadata.options)
          : translate('common.generalError')

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
