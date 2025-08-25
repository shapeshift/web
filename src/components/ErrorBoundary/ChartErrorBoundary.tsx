import { Button, Center, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaChartLine } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { createErrorBoundary } from './createErrorBoundary'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'

const chartIcon = <FaChartLine />

export const ChartErrorBoundary: React.FC<{
  children: React.ReactNode
  height?: string | number
}> = ({ children, height }) => {
  const BaseErrorBoundary = useMemo(
    () =>
      createErrorBoundary({
        errorBoundaryName: 'chart',
        FallbackComponent: ({ resetErrorBoundary }) => {
          const translate = useTranslate()
          return (
            <Center h={height} borderRadius='lg' bg='background.surface.raised.base' p={4}>
              <Stack spacing={3} align='center' textAlign='center'>
                <IconCircle fontSize='6xl' boxSize='16' bg='transparent' color='text.subtle'>
                  {chartIcon}
                </IconCircle>
                <RawText fontSize='md' fontWeight='semibold' color='text.base'>
                  {translate('errorBoundary.chart.title')}
                </RawText>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('errorBoundary.chart.body')}
                </RawText>
                <Button size='sm' colorScheme='blue' onClick={resetErrorBoundary} px={6}>
                  {translate('errorBoundary.chart.retry')}
                </Button>
              </Stack>
            </Center>
          )
        },
      }),
    [height],
  )

  return <BaseErrorBoundary>{children}</BaseErrorBoundary>
}
