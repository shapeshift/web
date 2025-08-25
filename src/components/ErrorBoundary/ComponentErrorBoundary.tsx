import { useTranslate } from 'react-polyglot'

import { createErrorBoundary } from './createErrorBoundary'
import { ErrorFallback } from './ErrorFallback'

type ComponentErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const ComponentErrorFallback: React.FC<ComponentErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <ErrorFallback
      title={translate('errorBoundary.component.title')}
      body={translate('errorBoundary.component.body')}
      retryLabel={translate('errorBoundary.component.retry')}
      onRetry={resetErrorBoundary}
      size='md'
    />
  )
}

export const ComponentErrorBoundary = createErrorBoundary({
  errorBoundaryName: 'component',
  FallbackComponent: ComponentErrorFallback,
})
