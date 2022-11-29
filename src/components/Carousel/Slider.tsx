import type { MotionStyle } from 'framer-motion'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

import type { SliderProps } from './types'

const pageStyle: MotionStyle = {
  width: '100%',
  height: '100%',
  display: 'inline-block',
  flex: 'none',
}

export const Slider = ({ x, i, onDragEnd, enableDrag = true, children }: SliderProps) => {
  const style = useMemo(() => {
    return {
      ...pageStyle,
      x,
      left: `${i * 100}%`,
      right: `${i * 100}%`,
    }
  }, [i, x])

  return (
    <motion.div style={style} drag={enableDrag && 'x'} dragElastic={0.3} onDragEnd={onDragEnd}>
      {children}
    </motion.div>
  )
}
