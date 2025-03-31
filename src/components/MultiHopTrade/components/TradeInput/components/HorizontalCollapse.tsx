import { Box } from '@chakra-ui/react'
import type { MotionStyle } from 'framer-motion'
import { motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'

export type HorizontalCollapseProps = {
  isOpen: boolean
  children: JSX.Element
  width: string | number
  height: string | number
}

export const HorizontalCollapse = ({
  isOpen,
  children,
  width,
  height,
}: HorizontalCollapseProps) => {
  const [hidden, setHidden] = useState(!isOpen)

  const motionStyle = useMemo(
    (): MotionStyle => ({
      height,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      position: 'relative',
    }),
    [height],
  )

  const animateProp = useMemo(() => ({ width: isOpen ? width : 1 }), [isOpen, width])

  const handleAnimationStart = useCallback(() => setHidden(false), [])
  const handleAnimationComplete = useCallback(() => setHidden(!isOpen), [isOpen])

  return (
    <motion.div
      hidden={hidden}
      initial={false}
      onAnimationStart={handleAnimationStart}
      onAnimationComplete={handleAnimationComplete}
      animate={animateProp}
      style={motionStyle}
    >
      <Box position='absolute' left={0} width={width} height={height}>
        {!hidden ? children : null}
      </Box>
    </motion.div>
  )
}
