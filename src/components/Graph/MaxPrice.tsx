export interface LineChartProps {
  width: number
  label: string
  yText: number
  stroke: string
}

export const MaxPrice = ({ label, yText, stroke, width }: LineChartProps) => {
  return (
    <g>
      <text
        x={width}
        y={yText}
        width={100}
        textAnchor='end'
        fill={stroke}
        fontSize='12px'
        dy='-1.75rem'
        dx='-0.5rem'
      >
        {label}
      </text>
    </g>
  )
}
