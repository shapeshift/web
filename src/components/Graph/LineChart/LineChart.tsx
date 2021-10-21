import { useColorModeValue } from '@chakra-ui/react'
import { marketService } from '@shapeshiftoss/types'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { AxisScale } from '@visx/axis'
import { Group } from '@visx/group'
import { LinePath } from '@visx/shape'
import React from 'react'
import { colors } from 'theme/colors'

export interface LineChartProps {
  data: marketService.HistoryData[]
  xScale: AxisScale<number>
  yScale: AxisScale<number>
  width: number
  yMax: number
  margin: { top: number; right: number; bottom: number; left: number }
  hideBottomAxis?: boolean
  stroke: string
  hideLeftAxis?: boolean
  top?: number
  left?: number
  children?: React.ReactNode
  xTickFormat?: (d: any) => any
}

export const LineChart = ({
  data,
  width,
  yMax,
  margin,
  xScale,
  yScale,
  hideBottomAxis = false,
  hideLeftAxis = false,
  stroke,
  top,
  left,
  xTickFormat,
  children
}: LineChartProps) => {
  const strokeColor = useColorModeValue(colors.gray[200], colors.gray[750])
  const labelColor = useColorModeValue(colors.gray[300], colors.gray[700])
  const AXIS_BOTTOM_TICK_LABEL_PROPS = {
    textAnchor: 'middle' as const,
    fontSize: 12,
    fontWeight: 'bold',
    fill: labelColor
  }
  const AXIS_LEFT_TICK_LABEL_PROPS = {
    dx: '-0.25em',
    dy: '0.25em',
    fontSize: 12,
    textAnchor: 'end' as const,
    fill: labelColor
  }
  if (!data) return null
  // accessors
  const getDate = (d: marketService.HistoryData) => new Date(d?.date)
  const getStockValue = (d: marketService.HistoryData) => d?.price

  if (width < 10) return null
  return (
    <Group left={left || margin.left} top={top || margin.top}>
      <LinePath<marketService.HistoryData>
        data={data}
        x={d => xScale(getDate(d)) || 0}
        y={d => yScale(getStockValue(d)) || 0}
        strokeWidth={1.5}
        stroke={stroke}
      />
      {!hideBottomAxis && (
        <AxisBottom
          top={yMax + margin.top}
          scale={xScale}
          numTicks={width > 520 ? 5 : 5}
          stroke={strokeColor}
          strokeWidth={1}
          hideTicks={true}
          tickLabelProps={() => AXIS_BOTTOM_TICK_LABEL_PROPS}
        />
      )}
      {!hideLeftAxis && (
        <AxisLeft
          scale={yScale}
          numTicks={5}
          stroke={strokeColor}
          tickStroke={strokeColor}
          tickLabelProps={() => AXIS_LEFT_TICK_LABEL_PROPS}
          tickFormat={d => {
            return xTickFormat ? xTickFormat(d) : d
          }}
        />
      )}
      {children}
    </Group>
  )
}
