import { useTranslate } from 'react-polyglot'

import { createErrorBoundary } from './createErrorBoundary'
import { ErrorFallback } from './ErrorFallback'

type TradingErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const TradingErrorFallback: React.FC<TradingErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <ErrorFallback
      title={translate('errorBoundary.trading.title')}
      body={translate('errorBoundary.trading.body')}
      retryLabel={translate('errorBoundary.trading.retry')}
      onRetry={resetErrorBoundary}
      size='lg'
    />
  )
}

export const TradingErrorBoundary = createErrorBoundary({
  errorBoundaryName: 'trading',
  FallbackComponent: TradingErrorFallback,
})
