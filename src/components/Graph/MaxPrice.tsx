import { HistoryData } from '@shapeshiftoss/types'
import { AxisScale } from '@visx/axis'
import { Text } from '@visx/text'

export interface LineChartProps {
  data: HistoryData[]
  xScale: AxisScale<number>
  yScale: AxisScale<number>
  width: number
  yMax: number
  label: string
  xDate: Date
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
  xDate,
  xText,
  margin
}: LineChartProps) => {
  const handleTextPos = (x: number): { x: number; anchor: 'end' | 'start' | 'middle' } => {
    const offsetWidth = width / 2
    const buffer = 16
    const end = width - offsetWidth
    if (x < offsetWidth) {
      return { x: x + buffer, anchor: 'start' }
    } else if (x > end) {
      return { x: x, anchor: 'end' }
    } else {
      return { x: x, anchor: 'start' }
    }
  }
  return (
    <g>
      <Text
        x={handleTextPos(xScale(xDate) || 0).x}
        y={yText}
        textAnchor={handleTextPos(xScale(xDate) || 0).anchor}
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
