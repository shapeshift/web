import { Center, CircularProgress } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import React, { Suspense, useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslate } from 'react-polyglot'

import { ErrorFallback } from './ErrorFallback'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { captureExceptionWithContext } from '@/utils/sentry/helpers'

type SuspenseErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const SuspenseErrorFallback: React.FC<SuspenseErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <ErrorFallback
      title={translate('errorBoundary.suspense.title')}
      body={translate('errorBoundary.suspense.body')}
      retryLabel={translate('errorBoundary.suspense.retry')}
      onRetry={resetErrorBoundary}
      size='sm'
    />
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
    captureExceptionWithContext(error, {
      tags: {
        errorBoundary: 'suspense',
      },
      extra: {
        componentStack: info.componentStack,
      },
      level: 'error',
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
