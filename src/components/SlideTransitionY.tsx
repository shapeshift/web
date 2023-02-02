import { Center } from '@chakra-ui/react'
import type { HTMLMotionProps } from 'framer-motion'
import { motion } from 'framer-motion'

import { CircularProgress } from './CircularProgress/CircularProgress'

const transition = { duration: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }
const pageVariants = {
  initial: { opacity: 0, y: 20, transition },
  animate: { opacity: 1, y: 0, transition },
  exit: {
    opacity: 0,
    y: -20,
    transition,
  },
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.05,
}

export const SlideTransitionY = ({
  children,
  loading,
  ...rest
}: HTMLMotionProps<'div'> & { loading?: boolean }) => {
  return (
    <motion.div
      initial='initial'
      animate='animate'
      exit='exit'
      variants={pageVariants}
      transition={pageTransition}
      {...rest}
    >
      {loading ? (
        <Center minH='200px' w='full'>
          <CircularProgress isIndeterminate />
        </Center>
      ) : (
        children
      )}
    </motion.div>
  )
}
