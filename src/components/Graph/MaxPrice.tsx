import type { AxisScale } from '@visx/axis'
import { Text } from '@visx/text'
import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { useMemo } from 'react'

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
  const makeTextPos = useCallback(
    (x: number): { x: number; anchor: 'end' | 'start' | 'middle' } => {
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
    },
    [width],
  )

  const xScaleDate = useMemo(() => xScale(xDate), [xDate, xScale])
  const textPos = useMemo(() => makeTextPos(xScaleDate || 0), [makeTextPos, xScaleDate])
  const xText = useMemo(() => textPos.x, [textPos.x])
  const textAnchor = useMemo(() => textPos.anchor, [textPos.anchor])

  return (
    <g>
      <Text
        x={xText}
        y={yText}
        textAnchor={textAnchor}
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
