import { Box, Button, Center, Stack } from '@chakra-ui/react'
import { captureException } from '@sentry/react'
import { useCallback } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { FaChartLine } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'
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

  return (
    <Center
      h={height}
      borderRadius='lg'
      bg='background.surface.raised.base'
      position='relative'
      overflow='hidden'
      p={4}
    >
      <Box
        position='absolute'
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg='background.surface.overlay.base'
        opacity={0.3}
        pointerEvents='none'
      />
      <Stack spacing={3} align='center' textAlign='center'>
        <IconCircle fontSize='2xl' boxSize='10' bg='border.base' color='text.subtle'>
          <FaChartLine />
        </IconCircle>
        <Box>
          <RawText fontSize='md' fontWeight='semibold' color='text.base' mb={1}>
            {translate('errorBoundary.chart.title')}
          </RawText>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('errorBoundary.chart.body')}
          </RawText>
        </Box>
        <Button size='sm' colorScheme='blue' onClick={resetErrorBoundary} px={6}>
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
