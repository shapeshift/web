import { CopyIcon } from '@chakra-ui/icons'
import { IconButton, useToast } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

export const CopyButton = ({ value }: { value: string }) => {
  const translate = useTranslate()
  const toast = useToast()
  const handleCopyClick = useCallback(async () => {
    const duration = 2500
    const isClosable = true
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(value)
      const title = translate('common.copied')
      const status = 'success'
      toast({ title, status, ...toastPayload })
    } catch (e) {
      const title = translate('common.copyFailed')
      const status = 'error'
      const description = translate('common.copyFailedDescription')
      toast({ description, title, status })
    }
  }, [value, toast, translate])

  return (
    <IconButton
      variant='ghost'
      size='small'
      aria-label='Copy'
      icon={<CopyIcon />}
      p={2}
      onClick={handleCopyClick}
    />
  )
}
