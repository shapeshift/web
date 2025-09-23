import { useTranslate } from 'react-polyglot'

import { createErrorBoundary } from './createErrorBoundary'
import { ErrorFallback } from './ErrorFallback'

type RampErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const RampErrorFallback: React.FC<RampErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <ErrorFallback
      title={translate('errorBoundary.ramp.title')}
      body={translate('errorBoundary.ramp.body')}
      retryLabel={translate('errorBoundary.ramp.retry')}
      onRetry={resetErrorBoundary}
      size='lg'
    />
  )
}

export const RampErrorBoundary = createErrorBoundary({
  errorBoundaryName: 'trading',
  FallbackComponent: RampErrorFallback,
})
