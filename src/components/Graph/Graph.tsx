import { Center, Fade, SlideFade } from '@chakra-ui/react'
import { HistoryData } from '@shapeshiftoss/types'
import { ParentSize } from '@visx/responsive'
import { useMemo } from 'react'

import { GraphLoading } from './GraphLoading'
import { PrimaryChart } from './PrimaryChart/PrimaryChart'

type GraphProps = {
  data: HistoryData[] | null
  isLoaded?: boolean
  loading?: boolean
  color?: string
}

export const Graph = ({ data, isLoaded, loading, color }: GraphProps) => {
  return useMemo(
    () => (
      <ParentSize debounceTime={10}>
        {parent =>
          loading || !isLoaded ? (
            <Fade in={loading || !isLoaded}>
              <Center width='full' height={parent.height} overflow='hidden'>
                <GraphLoading />
              </Center>
            </Fade>
          ) : data?.length ? (
            <SlideFade in={!loading}>
              <PrimaryChart
                data={data ?? []}
                height={parent.height}
                width={parent.width}
                color={color}
                margin={{
                  top: 16,
                  right: 0,
                  bottom: 60,
                  left: 0
                }}
              />
            </SlideFade>
          ) : null
        }
      </ParentSize>
    ),
    [color, data, isLoaded, loading]
  )
}
