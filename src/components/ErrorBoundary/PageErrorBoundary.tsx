import { Box, Button, Center, Heading, Stack } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import { useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { FaSadTear } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

type PageErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const PageErrorFallback: React.FC<PageErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <Center minH='100vh' px={4}>
      <Box
        p={8}
        borderRadius='xl'
        bg='background.surface.raised.base'
        border='1px'
        borderColor='border.base'
        maxW='lg'
        w='full'
      >
        <Stack spacing={4} align='center' textAlign='center'>
          <IconCircle fontSize='4xl' boxSize='20' bg='blue.500' color='white'>
            <FaSadTear />
          </IconCircle>
          <Box>
            <Heading size='lg' lineHeight='shorter' color='text.base' mb={2}>
              {translate('errorBoundary.page.title')}
            </Heading>
            <RawText fontSize='md' color='text.subtle'>
              {translate('errorBoundary.page.body')}
            </RawText>
          </Box>
          <Button size='md' colorScheme='blue' onClick={resetErrorBoundary} px={8}>
            {translate('errorBoundary.page.retry')}
          </Button>
        </Stack>
      </Box>
    </Center>
  )
}

type PageErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ComponentType<PageErrorFallbackProps>
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = PageErrorFallback,
}) => {
  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    captureException(error, {
      tags: {
        errorBoundary: 'page',
      },
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    })
    getMixPanel()?.track(MixPanelEvent.Error, {
      error: error.message,
      errorBoundary: 'page',
      componentStack: info.componentStack,
    })
  }, [])

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
