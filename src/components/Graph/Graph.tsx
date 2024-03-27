import { Center, Fade } from '@chakra-ui/react'
import { ParentSize } from '@visx/responsive'
import type { ParentSizeProvidedProps } from '@visx/responsive/lib/components/ParentSize'
import { isEmpty } from 'lodash'
import { lazy, Suspense, useCallback } from 'react'
import type { BalanceChartData } from 'hooks/useBalanceChartData/useBalanceChartData'

import { GraphLoading } from './GraphLoading'

const RainbowChart = lazy(() =>
  import('./RainbowChart/RainbowChart').then(({ RainbowChart }) => ({ default: RainbowChart })),
)
const PrimaryChart = lazy(() =>
  import('./PrimaryChart/PrimaryChart').then(({ PrimaryChart }) => ({ default: PrimaryChart })),
)

const suspenseFallback = <div />

type GraphProps = {
  data: BalanceChartData
  isLoading: boolean
  color: string
  isRainbowChart?: boolean
  hideAxis?: boolean
}

const margin = {
  top: 8,
  right: 0,
  bottom: 8,
  left: 0,
}

export const Graph: React.FC<GraphProps> = ({
  data,
  isLoading,
  color,
  isRainbowChart,
  hideAxis,
}) => {
  const { total, rainbow } = data
  const renderGraph = useCallback(
    ({ height, width }: ParentSizeProvidedProps) => {
      return isLoading ? (
        <Fade in={isLoading}>
          <Center width='full' height={height} overflow='hidden'>
            <GraphLoading />
          </Center>
        </Fade>
      ) : !isEmpty(data) ? (
        isRainbowChart ? (
          <Suspense fallback={suspenseFallback}>
            <RainbowChart
              height={height}
              width={width}
              color={color}
              margin={margin}
              data={rainbow}
            />
          </Suspense>
        ) : (
          <Suspense fallback={suspenseFallback}>
            <PrimaryChart
              height={height}
              width={width}
              color={color}
              margin={margin}
              data={total}
              hideAxis={hideAxis}
            />
          </Suspense>
        )
      ) : null
    },
    [color, data, hideAxis, isLoading, isRainbowChart, rainbow, total],
  )
  return <ParentSize debounceTime={10}>{renderGraph}</ParentSize>
}
