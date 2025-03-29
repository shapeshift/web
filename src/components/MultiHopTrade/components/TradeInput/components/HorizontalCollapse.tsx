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

  // Add a small buffer to the width to prevent content cutoff issues
  const animateWidth = useMemo(() => {
    // Only add buffer to numeric widths
    if (typeof width === 'number') {
      return isOpen ? width + 8 : 1
    }
    return isOpen ? width : 1
  }, [isOpen, width])

  const animateProp = useMemo(
    () => ({
      width: animateWidth,
    }),
    [animateWidth],
  )

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
