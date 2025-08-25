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

type TradingErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const TradingErrorFallback: React.FC<TradingErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <Center p={6}>
      <Box
        p={8}
        borderRadius='xl'
        bg='background.surface.raised.base'
        border='1px'
        borderColor='border.base'
      >
        <Stack spacing={4} align='center' textAlign='center'>
          <IconCircle fontSize='3xl' boxSize='12' bg='blue.500' color='white'>
            <FaSadTear />
          </IconCircle>
          <Heading size='md' lineHeight='shorter' color='text.base'>
            {translate('errorBoundary.trading.title')}
          </Heading>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('errorBoundary.trading.body')}
          </RawText>
          <Button size='sm' colorScheme='blue' onClick={resetErrorBoundary}>
            {translate('errorBoundary.trading.retry')}
          </Button>
        </Stack>
      </Box>
    </Center>
  )
}

type TradingErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ComponentType<TradingErrorFallbackProps>
}

export const TradingErrorBoundary: React.FC<TradingErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = TradingErrorFallback,
}) => {
  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    captureException(error, {
      tags: {
        errorBoundary: 'trading',
      },
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    })
    getMixPanel()?.track(MixPanelEvent.Error, {
      error: error.message,
      errorBoundary: 'trading',
      componentStack: info.componentStack,
    })
  }, [])

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
