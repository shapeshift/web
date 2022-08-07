import { Center, Fade, SlideFade } from '@chakra-ui/react'
import { HistoryData } from '@shapeshiftoss/types'
import { ParentSize } from '@visx/responsive'
import { useMemo } from 'react'

import { GraphLoading } from './GraphLoading'
import { PrimaryChart } from './PrimaryChart/PrimaryChart'
import { RainbowChart } from './RainbowChart/RainbowChart'

type GraphProps = {
  data: HistoryData[] | null
  isLoaded?: boolean
  loading?: boolean
  color?: string
  rainbow?: boolean
}

export const Graph = ({ data, isLoaded, loading, color, rainbow }: GraphProps) => {
  return useMemo(() => {
    return (
      <ParentSize debounceTime={10}>
        {parent => {
          const primaryChartProps = {
            data: data ?? [],
            height: parent.height,
            width: parent.width,
            color,
            margin: {
              top: 16,
              right: 0,
              bottom: 60,
              left: 0,
            },
          }
          return loading || !isLoaded ? (
            <Fade in={loading || !isLoaded}>
              <Center width='full' height={parent.height} overflow='hidden'>
                <GraphLoading />
              </Center>
            </Fade>
          ) : data?.length ? (
            <SlideFade in={!loading}>
              {rainbow ? (
                <RainbowChart {...primaryChartProps} />
              ) : (
                <PrimaryChart {...primaryChartProps} />
              )}
            </SlideFade>
          ) : null
        }}
      </ParentSize>
    )
  }, [color, data, isLoaded, loading, rainbow])
}
