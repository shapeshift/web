import { Box, Button, Center, CircularProgress, Heading, Stack } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import type { lazy, ReactNode } from 'react'
import React, { Suspense, useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { FaSadTear } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

type SuspenseErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const SuspenseErrorFallback: React.FC<SuspenseErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <Center p={8} minH='200px'>
      <Box
        p={6}
        borderRadius='xl'
        bg='background.surface.raised.base'
        border='1px'
        borderColor='border.base'
        maxW='sm'
      >
        <Stack spacing={3} align='center' textAlign='center'>
          <IconCircle fontSize='xl' boxSize='8' bg='blue.500' color='white'>
            <FaSadTear />
          </IconCircle>
          <Heading size='sm' lineHeight='shorter' color='text.base'>
            {translate('errorBoundary.suspense.title')}
          </Heading>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('errorBoundary.suspense.body')}
          </RawText>
          <Button size='xs' colorScheme='blue' onClick={resetErrorBoundary}>
            {translate('errorBoundary.suspense.retry')}
          </Button>
        </Stack>
      </Box>
    </Center>
  )
}

const SuspenseLoadingFallback: React.FC<{ height?: string | number }> = ({ height = '200px' }) => (
  <Center h={height}>
    <CircularProgress isIndeterminate size='48px' />
  </Center>
)

type SuspenseErrorBoundaryProps = {
  children: ReactNode
  fallback?: React.ComponentType<SuspenseErrorFallbackProps>
  loadingFallback?: ReactNode
  height?: string | number
}

export const SuspenseErrorBoundary: React.FC<SuspenseErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = SuspenseErrorFallback,
  loadingFallback,
  height,
}) => {
  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    captureException(error, {
      tags: {
        errorBoundary: 'suspense',
      },
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    })
    getMixPanel()?.track(MixPanelEvent.Error, {
      error: error.message,
      errorBoundary: 'suspense',
      componentStack: info.componentStack,
    })
  }, [])

  const suspenseFallback = loadingFallback || <SuspenseLoadingFallback height={height} />

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onError={handleError}>
      <Suspense fallback={suspenseFallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}

// Enhanced makeSuspenseful utility with error boundary
export function makeSuspensefulWithErrorBoundary<T extends Record<string, any>>(
  lazyComponent: ReturnType<typeof lazy>,
  loadingProps?: T,
  errorFallback?: React.ComponentType<SuspenseErrorFallbackProps>,
): React.ComponentType {
  const LoadingFallback = loadingProps ? (
    <Box
      height='100vh'
      display='flex'
      alignItems='center'
      justifyContent='center'
      {...loadingProps}
    >
      <CircularProgress size='48px' isIndeterminate />
    </Box>
  ) : undefined

  return function SuspensefulComponent() {
    return (
      <SuspenseErrorBoundary loadingFallback={LoadingFallback} fallback={errorFallback}>
        {React.createElement(lazyComponent)}
      </SuspenseErrorBoundary>
    )
  }
}
