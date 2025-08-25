import { Button, Center, Stack, Text } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import { useCallback, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { FaChartLine } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

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

  const centerProps = useMemo(
    () => ({
      h: height,
      borderRadius: 'lg',
      bg: 'gray.50',
      _dark: { bg: 'gray.900' },
      border: '1px',
      borderColor: 'gray.200',
    }),
    [height],
  )

  const darkCenterProps = useMemo(
    () => ({
      borderColor: 'gray.700',
    }),
    [],
  )

  const stackProps = useMemo(
    () => ({
      spacing: 3,
      align: 'center' as const,
      textAlign: 'center' as const,
    }),
    [],
  )

  const textProps = useMemo(
    () => ({
      fontSize: 'sm',
      fontWeight: 'medium',
      color: 'gray.600',
      _dark: { color: 'gray.400' },
    }),
    [],
  )

  return (
    <Center {...centerProps} _dark={darkCenterProps}>
      <Stack {...stackProps}>
        <IconCircle fontSize='xl' boxSize='6' bg='gray.400' color='white'>
          <FaChartLine />
        </IconCircle>
        <Text {...textProps}>{translate('errorBoundary.chart.title')}</Text>
        <Button size='xs' variant='ghost' onClick={resetErrorBoundary}>
          {translate('errorBoundary.chart.retry')}
        </Button>
      </Stack>
    </Center>
  )
}

type ChartErrorBoundaryProps = {
  children: React.ReactNode
  fallback?: React.ComponentType<ChartErrorFallbackProps>
  height?: string | number
}

export const ChartErrorBoundary: React.FC<ChartErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = ChartErrorFallback,
  height,
}) => {
  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    captureException(error, {
      tags: {
        errorBoundary: 'chart',
      },
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    })
    getMixPanel()?.track(MixPanelEvent.Error, {
      error: error.message,
      errorBoundary: 'chart',
      componentStack: info.componentStack,
    })
  }, [])

  const FallbackWithHeight = useCallback(
    (props: ChartErrorFallbackProps) => <FallbackComponent {...props} height={height} />,
    [FallbackComponent, height],
  )

  return (
    <ErrorBoundary FallbackComponent={FallbackWithHeight} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
