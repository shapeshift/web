import type { MotionStyle } from 'framer-motion'
import { motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

const initialProps = { opacity: 0 }
const animateProps = { opacity: 1 }
const exitProps = { opacity: 0, transition: { duration: 0.5 } }
const transitionProps = { delay: 0.2, duration: 0.1 }
const motionStyle: MotionStyle = {
  backgroundColor: 'var(--chakra-colors-blanket)',
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 4,
}

export const WarningOverlay: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <motion.div
      key='overlay'
      style={motionStyle}
      initial={initialProps}
      animate={animateProps}
      exit={exitProps}
      transition={transitionProps}
    >
      {children}
    </motion.div>
  )
}
