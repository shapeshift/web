import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import { useCallback, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { FaExclamationTriangle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

type ComponentErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const ComponentErrorFallback: React.FC<ComponentErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  const boxProps = useMemo(
    () => ({
      p: 6,
      borderRadius: 'lg',
      bg: 'gray.50',
      _dark: { bg: 'gray.900' },
      border: '1px',
      borderColor: 'yellow.200',
    }),
    [],
  )

  const darkBoxProps = useMemo(
    () => ({
      borderColor: 'yellow.800',
    }),
    [],
  )

  const stackProps = useMemo(
    () => ({
      spacing: 4,
      align: 'center' as const,
      textAlign: 'center' as const,
    }),
    [],
  )

  const headingProps = useMemo(
    () => ({
      size: 'md',
      color: 'yellow.600',
      _dark: { color: 'yellow.400' },
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
    <Box {...boxProps} _dark={darkBoxProps}>
      <Stack {...stackProps}>
        <IconCircle fontSize='2xl' boxSize='8' bg='yellow.500' color='white'>
          <FaExclamationTriangle />
        </IconCircle>
        <Heading {...headingProps}>{translate('errorBoundary.component.title')}</Heading>
        <Text {...textProps}>{translate('errorBoundary.component.body')}</Text>
        <Button size='sm' colorScheme='yellow' onClick={resetErrorBoundary}>
          {translate('errorBoundary.component.retry')}
        </Button>
      </Stack>
    </Box>
  )
}

type ComponentErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ComponentType<ComponentErrorFallbackProps>
}

export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = ComponentErrorFallback,
}) => {
  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    captureException(error, {
      tags: {
        errorBoundary: 'component',
      },
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    })
    getMixPanel()?.track(MixPanelEvent.Error, {
      error: error.message,
      errorBoundary: 'component',
      componentStack: info.componentStack,
    })
  }, [])

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
