import { HistoryData } from '@shapeshiftoss/types'
import { AxisScale } from '@visx/axis'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { LinearGradient } from '@visx/gradient'
import { Group } from '@visx/group'
import { AreaClosed } from '@visx/shape'
import React from 'react'

import { AXIS_BOTTOM_TICK_LABEL_PROPS, AXIS_COLOR, AXIS_LEFT_TICK_LABEL_PROPS } from './constants'

export interface AreaChartProps {
  data: HistoryData[]
  xScale: AxisScale<number>
  yScale: AxisScale<number>
  width: number
  yMax: number
  margin: { top: number; right: number; bottom: number; left: number }
  gradientColor: string
  stroke?: string
  hideBottomAxis?: boolean
  hideLeftAxis?: boolean
  top?: number
  left?: number
  children?: React.ReactNode
}

export const AreaChart = ({
  data,
  width,
  yMax,
  margin,
  xScale,
  yScale,
  gradientColor,
  hideBottomAxis = false,
  hideLeftAxis = false,
  top,
  left,
  children
}: AreaChartProps) => {
  // accessors
  const getDate = (d: HistoryData) => new Date(d?.date)
  const getStockValue = (d: HistoryData) => d?.price

  if (width < 10) return null
  return (
    <Group left={left || margin.left} top={top || margin.top}>
      <LinearGradient
        id='gradient'
        from={`${gradientColor}20`}
        fromOpacity={1}
        to={`${gradientColor}02`}
        toOpacity={0.2}
      />
      <AreaClosed<HistoryData>
        data={data}
        x={d => xScale(getDate(d)) || 0}
        y={d => yScale(getStockValue(d)) || 0}
        yScale={yScale}
        strokeWidth={1.5}
        stroke={`url(#gradient)`}
        fill={`url(#gradient)`}
      />
      {!hideBottomAxis && (
        <AxisBottom
          top={yMax}
          scale={xScale}
          numTicks={width > 520 ? 10 : 5}
          stroke={AXIS_COLOR}
          tickStroke={AXIS_COLOR}
          tickLabelProps={() => AXIS_BOTTOM_TICK_LABEL_PROPS}
        />
      )}
      {!hideLeftAxis && (
        <AxisLeft
          scale={yScale}
          numTicks={5}
          stroke={AXIS_COLOR}
          tickStroke={AXIS_COLOR}
          tickLabelProps={() => AXIS_LEFT_TICK_LABEL_PROPS}
        />
      )}
      {children}
    </Group>
  )
}
