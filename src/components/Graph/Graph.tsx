import { Center, Fade } from '@chakra-ui/react'
import { ParentSize } from '@visx/responsive'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import type { BalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'

import { GraphLoading } from './GraphLoading'
import { PrimaryChart } from './PrimaryChart/PrimaryChart'
import { RainbowChart } from './RainbowChart/RainbowChart'

type GraphProps = {
  data: BalanceChartData
  isLoaded?: boolean
  loading?: boolean
  color: string
  isRainbowChart?: boolean
}

export const Graph: React.FC<GraphProps> = ({ data, isLoaded, loading, color, isRainbowChart }) => {
  return useMemo(() => {
    const { total, rainbow } = data
    return (
      <ParentSize debounceTime={10}>
        {parent => {
          const primaryChartProps = {
            height: parent.height,
            width: parent.width,
            color,
            margin: {
              top: 16,
              right: 0,
              bottom: 32,
              left: 0,
            },
          }
          return loading || !isLoaded ? (
            <Fade in={loading || !isLoaded}>
              <Center width='full' height={parent.height} overflow='hidden'>
                <GraphLoading />
              </Center>
            </Fade>
          ) : !isEmpty(data) ? (
            isRainbowChart ? (
              <RainbowChart {...primaryChartProps} data={rainbow} />
            ) : (
              <PrimaryChart {...primaryChartProps} data={total} />
            )
          ) : null
        }}
      </ParentSize>
    )
  }, [color, data, isLoaded, loading, isRainbowChart])
}
