import { useToken } from '@chakra-ui/system'
import { Group } from '@visx/group'
import type { PieArcDatum, ProvidedProps } from '@visx/shape/lib/shapes/Pie'
import Pie from '@visx/shape/lib/shapes/Pie'
import { useCallback, useMemo } from 'react'

const defaultMargin = { top: 0, right: 0, bottom: 0, left: 0 }
type DonutChartProps = {
  width: number
  height: number
  margin?: typeof defaultMargin
  data: ChartData[]
}

export type ChartData = {
  name: string
  value: number
  color: string
}

const frequency = (d: ChartData) => d.value

type ArcProps = {
  pie: ProvidedProps<ChartData>
  arc: PieArcDatum<ChartData>
  index: number
}

const Arc: React.FC<ArcProps> = ({ pie, arc, index }) => {
  const { name, color } = arc.data
  const themeColor = useToken('colors', color)
  const arcPath = pie.path(arc)
  return (
    <g key={`arc-${name}-${index}`}>
      <path d={arcPath ?? ''} fill={themeColor} />
    </g>
  )
}

const PieArcs: React.FC<ArcProps['pie']> = pie => {
  const renderPie = useMemo(() => {
    return pie.arcs.map((arc, index) => <Arc key={arc.index} pie={pie} arc={arc} index={index} />)
  }, [pie])
  return <>{renderPie}</>
}

export const DonutChart: React.FC<DonutChartProps> = ({
  width,
  height,
  margin = defaultMargin,
  data,
}) => {
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const radius = Math.min(innerWidth, innerHeight) / 2
  const centerY = innerHeight / 2
  const centerX = innerWidth / 2
  const top = centerY + margin.top
  const left = centerX + margin.left

  const pieSortValues = useCallback((a: number, b: number) => {
    return b - a
  }, [])

  return (
    <svg width={width} height={height}>
      <Group top={top} left={left}>
        <Pie
          data={data}
          pieValue={frequency}
          pieSortValues={pieSortValues}
          outerRadius={radius}
          innerRadius={radius - 4}
        >
          {pie => <PieArcs {...pie} />}
        </Pie>
      </Group>
    </svg>
  )
}
