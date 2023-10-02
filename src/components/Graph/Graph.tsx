import { Center, Fade } from '@chakra-ui/react'
import { ParentSize } from '@visx/responsive'
import type { ParentSizeProvidedProps } from '@visx/responsive/lib/components/ParentSize'
import { isEmpty } from 'lodash'
import { useCallback } from 'react'
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
  isLoaded,
  loading,
  color,
  isRainbowChart,
  hideAxis,
}) => {
  const { total, rainbow } = data
  const renderGraph = useCallback(
    ({ height, width }: ParentSizeProvidedProps) => {
      return loading || !isLoaded ? (
        <Fade in={loading || !isLoaded}>
          <Center width='full' height={height} overflow='hidden'>
            <GraphLoading />
          </Center>
        </Fade>
      ) : !isEmpty(data) ? (
        isRainbowChart ? (
          <RainbowChart
            height={height}
            width={width}
            color={color}
            margin={margin}
            data={rainbow}
          />
        ) : (
          <PrimaryChart
            height={height}
            width={width}
            color={color}
            margin={margin}
            data={total}
            hideAxis={hideAxis}
          />
        )
      ) : null
    },
    [color, data, hideAxis, isLoaded, isRainbowChart, loading, rainbow, total],
  )
  return <ParentSize debounceTime={10}>{renderGraph}</ParentSize>
}
