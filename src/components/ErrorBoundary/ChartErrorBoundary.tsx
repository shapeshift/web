import { useMemo } from 'react'
import { FaChartLine } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { createErrorBoundary } from './createErrorBoundary'
import { ErrorFallback } from './ErrorFallback'

type ChartErrorFallbackProps = {
  error: Error
  resetErrorBoundary: () => void
  height?: string | number
}

const ChartErrorFallback: React.FC<ChartErrorFallbackProps> = ({
  resetErrorBoundary,
  height = '300px',
}) => {
  const translate = useTranslate()
  const icon = useMemo(() => <FaChartLine />, [])

  return (
    <ErrorFallback
      icon={icon}
      title={translate('errorBoundary.chart.title')}
      body={translate('errorBoundary.chart.body')}
      retryLabel={translate('errorBoundary.chart.retry')}
      onRetry={resetErrorBoundary}
      size='md'
      height={height}
      showOverlay
    />
  )
}

export const ChartErrorBoundary = createErrorBoundary({
  errorBoundaryName: 'chart',
  FallbackComponent: ChartErrorFallback,
})
