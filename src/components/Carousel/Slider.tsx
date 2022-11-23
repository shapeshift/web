import type { MotionStyle } from 'framer-motion'
import { motion } from 'framer-motion'

import type { SliderProps } from './types'

const pageStyle: MotionStyle = {
  width: '100%',
  height: '100%',
  display: 'inline-block',
  flex: 'none',
}

export const Slider = ({ x, i, onDragEnd, enableDrag = true, children }: SliderProps) => (
  <motion.div
    style={{
      ...pageStyle,
      x,
      left: `${i * 100}%`,
      right: `${i * 100}%`,
    }}
    drag={enableDrag ?? 'x'}
    dragElastic={0.3}
    onDragEnd={onDragEnd}
  >
    {children}
  </motion.div>
)
