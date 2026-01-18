import { Box, Center, Text, useColorModeValue } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { ResolutionString } from '../../../../public/charting_library/charting_library'

import { TradingViewChart } from '@/components/TradingViewChart'

type PerpsChartProps = {
  coin: string | null
  height?: number
}

const DEFAULT_RESOLUTION: ResolutionString = '60' as ResolutionString

export const PerpsChart = memo(({ coin, height = 600 }: PerpsChartProps) => {
  const translate = useTranslate()
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  if (!coin) {
    return (
      <Box height={height} borderRadius='lg' border='1px solid' borderColor={borderColor}>
        <Center h='full'>
          <Text color='text.subtle' fontSize='sm'>
            {translate('perps.chart.selectMarket')}
          </Text>
        </Center>
      </Box>
    )
  }

  return (
    <Box
      height={height}
      borderRadius='lg'
      border='1px solid'
      borderColor={borderColor}
      overflow='hidden'
    >
      <TradingViewChart symbol={coin} interval={DEFAULT_RESOLUTION} height={height} />
    </Box>
  )
})
