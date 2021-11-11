import { HistoryData } from '@shapeshiftoss/types'
import { AxisScale } from '@visx/axis'
import { LinePath } from '@visx/shape'
import { Text } from '@visx/text'

export interface LineChartProps {
  data: HistoryData[]
  xScale: AxisScale<number>
  yScale: AxisScale<number>
  width: number
  yMax: number
  label: string
  yText: number
  xText: number
  margin: { top: number; right: number; bottom: number; left: number }
  hideBottomAxis?: boolean
  stroke: string
  hideLeftAxis?: boolean
  top?: number
  left?: number
  children?: React.ReactNode
  xTickFormat?: (d: any) => any
}

export const MaxPrice = ({
  data,
  label,
  yText,
  yScale,
  xScale,
  stroke,
  width,
  xText,
  margin
}: LineChartProps) => {
  const getDate = (d: HistoryData) => new Date(d?.date)
  const getStockValue = (d: HistoryData) => d?.price
  return (
    <g>
      <LinePath<HistoryData>
        data={data}
        x={d => xScale(getDate(d)) || 0}
        y={d => yScale(getStockValue(d)) || 0}
        stroke='#6086d6'
        strokeWidth={1}
        strokeDasharray='4,4'
        strokeOpacity='.3'
      />
      <Text
        x={width}
        y={yText}
        textAnchor='end'
        fill={stroke}
        fontSize='12px'
        dy='-0.5rem'
        dx='-0.5rem'
      >
        {label}
      </Text>
    </g>
  )
}
