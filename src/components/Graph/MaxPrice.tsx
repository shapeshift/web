import { animated, useSpring } from '@react-spring/web'
export interface LineChartProps {
  width: number
  label: string
  yText: number
  stroke: string
}

export const MaxPrice = ({ label, yText, stroke, width }: LineChartProps) => {
  const styles = useSpring({ y: yText })

  return (
    <g>
      <animated.text
        x={width}
        y={styles.y}
        width={100}
        textAnchor='end'
        fill={stroke}
        fontSize='12px'
        dy='-1rem'
        dx='-0.5rem'
      >
        {label}
      </animated.text>
    </g>
  )
}
