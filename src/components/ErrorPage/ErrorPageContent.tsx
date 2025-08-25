import { Button, Center, Heading, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaSadTear } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'

type ErrorPageContentProps = {
  resetErrorBoundary?: () => void
}

export const ErrorPageContent: React.FC<ErrorPageContentProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  const handleReset = useCallback(() => {
    if (resetErrorBoundary) {
      resetErrorBoundary()
    } else {
      // Default behavior: reload the page
      window.location.reload()
    }
  }, [resetErrorBoundary])

  return (
    <Center width='full' height='100%'>
      <Stack justifyContent='center' alignItems='center'>
        <IconCircle fontSize='6xl' boxSize='16' bg='blue.500' color='white'>
          <FaSadTear />
        </IconCircle>
        <Heading lineHeight='shorter' fontSize='6xl'>
          {translate('errorPage.title')}
        </Heading>
        <RawText fontSize='xl'>{translate('errorPage.body')}</RawText>
        <Button colorScheme='blue' onClick={handleReset}>
          {translate('errorPage.cta')}
        </Button>
      </Stack>
    </Center>
  )
}
