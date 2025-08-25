import { Alert, AlertIcon, Box, Button, Stack, Text } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import { useCallback, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslate } from 'react-polyglot'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

type TradingErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const TradingErrorFallback: React.FC<TradingErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  const stackProps = useMemo(
    () => ({
      spacing: 3,
      flex: '1',
    }),
    [],
  )

  const textProps = useMemo(
    () => ({
      fontSize: 'sm',
      color: 'gray.600',
      _dark: { color: 'gray.400' },
    }),
    [],
  )

  return (
    <Box p={4}>
      <Alert status='error' borderRadius='lg'>
        <AlertIcon />
        <Stack {...stackProps}>
          <Text fontWeight='medium'>{translate('errorBoundary.trading.title')}</Text>
          <Text {...textProps}>{translate('errorBoundary.trading.body')}</Text>
          <Button
            size='sm'
            colorScheme='red'
            variant='outline'
            onClick={resetErrorBoundary}
            alignSelf='flex-start'
          >
            {translate('errorBoundary.trading.retry')}
          </Button>
        </Stack>
      </Alert>
    </Box>
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
