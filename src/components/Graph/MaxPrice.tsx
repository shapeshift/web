import { AxisScale } from '@visx/axis'
import { Text } from '@visx/text'
import { ReactNode } from 'react'

export interface LineChartProps {
  xScale: AxisScale<number>
  width: number
  yMax: number
  label: string
  xDate: Date
  yText: number
  hideBottomAxis?: boolean
  stroke: string
  hideLeftAxis?: boolean
  top?: number
  left?: number
  children?: ReactNode
  xTickFormat?: (d: any) => any
}

export const MaxPrice = ({ label, yText, xScale, stroke, width, xDate }: LineChartProps) => {
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
