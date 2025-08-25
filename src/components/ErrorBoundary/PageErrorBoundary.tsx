import { useTranslate } from 'react-polyglot'

import { createErrorBoundary } from './createErrorBoundary'
import { ErrorFallback } from './ErrorFallback'

type PageErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
}

const PageErrorFallback: React.FC<PageErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  return (
    <ErrorFallback
      title={translate('errorBoundary.page.title')}
      body={translate('errorBoundary.page.body')}
      retryLabel={translate('errorBoundary.page.retry')}
      onRetry={resetErrorBoundary}
      size='page'
    />
  )
}

export const PageErrorBoundary = createErrorBoundary({
  errorBoundaryName: 'page',
  FallbackComponent: PageErrorFallback,
})
