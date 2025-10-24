import type { ComponentType, ReactNode } from 'react'
import { useCallback } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'

import { captureExceptionWithContext } from '@/utils/sentry/helpers'

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
      captureExceptionWithContext(error, {
        tags: {
          errorBoundary: errorBoundaryName,
        },
        extra: {
          componentStack: info.componentStack,
        },
        level: 'error',
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
