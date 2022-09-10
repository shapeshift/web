import type { AxisScale } from '@visx/axis'
import { Text } from '@visx/text'

export interface LineChartProps {
  xScale: AxisScale<number>
  width: number
  yMax: number
  xDate: Date
  label: string
  yText: number
  margin: { top: number; right: number; bottom: number; left: number }
  hideBottomAxis?: boolean
  stroke: string
  hideLeftAxis?: boolean
  top?: number
  left?: number
  children?: React.ReactNode
  xTickFormat?: (d: any) => any
}

export const MinPrice = ({ label, yText, xScale, stroke, width, xDate }: LineChartProps) => {
  const xPos = xScale(xDate)
  const handleTextPos = (x: number): { x: number; anchor: 'end' | 'start' | 'middle' } => {
    const offsetWidth = width / 2
    const buffer = 16
    const end = width - offsetWidth
    if (x < offsetWidth) {
      return { x: x + buffer, anchor: 'start' }
    } else if (x > end) {
      return { x, anchor: 'end' }
    } else {
      return { x, anchor: 'start' }
    }
  }
  return (
    <g>
      <Text
        x={handleTextPos(xPos || 0).x}
        y={yText}
        textAnchor={handleTextPos(xPos || 0).anchor}
        fill={stroke}
        fontSize='12px'
        dy='1rem'
        dx='-0.5rem'
        width={100}
      >
        {label}
      </Text>
    </g>
  )
}
