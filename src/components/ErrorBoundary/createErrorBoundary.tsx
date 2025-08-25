import { captureException } from '@sentry/react'
import type { ComponentType, ReactNode } from 'react'
import { useCallback } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

type CreateErrorBoundaryOptions = {
  errorBoundaryName: string
  FallbackComponent: ComponentType<FallbackProps & Record<string, unknown>>
}

export function createErrorBoundary({
  errorBoundaryName,
  FallbackComponent,
}: CreateErrorBoundaryOptions) {
  return function CustomErrorBoundary({
    children,
    ...props
  }: {
    children: ReactNode
    [key: string]: unknown
  }) {
    const handleError = useCallback((error: Error, info: { componentStack: string }) => {
      captureException(error, {
        tags: {
          errorBoundary: errorBoundaryName,
        },
        contexts: {
          react: {
            componentStack: info.componentStack,
          },
        },
      })
      getMixPanel()?.track(MixPanelEvent.Error, {
        error: error.message,
        errorBoundary: errorBoundaryName,
        componentStack: info.componentStack,
      })
    }, [])

    const FallbackWithProps = useCallback(
      (fallbackProps: FallbackProps) => <FallbackComponent {...fallbackProps} {...props} />,
      [props],
    )

    return (
      <ErrorBoundary FallbackComponent={FallbackWithProps} onError={handleError}>
        {children}
      </ErrorBoundary>
    )
  }
}
