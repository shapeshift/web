import { HTMLMotionProps, motion } from 'framer-motion'
import * as React from 'react'
const transition = { duration: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }
const pageVariants = {
  initial: { opacity: 0, x: 60, transition },
  animate: { opacity: 1, x: 0, transition },
  exit: {
    opacity: 0,
    x: -60,
    transition
  }
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.05
}

export const SlideTransition = (props: HTMLMotionProps<'div'>) => (
  <motion.div
    initial='initial'
    animate='animate'
    exit='exit'
    variants={pageVariants}
    transition={pageTransition}
    {...props}
  />
)
