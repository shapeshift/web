import { animated, useSpring } from '@react-spring/web'
export interface LineChartProps {
  width: number
  label: string
  yText: number
  stroke: string
}

export const MinPrice = ({ label, yText, stroke, width }: LineChartProps) => {
  const styles = useSpring({ y: yText })

  return (
    <g>
      <animated.text
        x={width}
        width={100}
        dy='1.5rem'
        dx='-0.5rem'
        fontSize='12px'
        fill={stroke}
        textAnchor='end'
        y={styles.y}
      >
        {label}
      </animated.text>
    </g>
  )
}
