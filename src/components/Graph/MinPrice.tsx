export interface LineChartProps {
  width: number
  label: string
  yText: number
  stroke: string
}

export const MinPrice = ({ label, yText, stroke, width }: LineChartProps) => {
  return (
    <g>
      <text
        x={width}
        y={yText}
        width={100}
        dy='2.25rem'
        dx='-0.5rem'
        fontSize='12px'
        fill={stroke}
        textAnchor='end'
      >
        {label}
      </text>
    </g>
  )
}
