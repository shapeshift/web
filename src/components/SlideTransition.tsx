import { Center } from '@chakra-ui/react'
import { HTMLMotionProps, motion } from 'framer-motion'

import { CircularProgress } from './CircularProgress/CircularProgress'

const transition = { duration: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }
const pageVariants = {
  initial: { opacity: 0, x: 20, transition },
  animate: { opacity: 1, x: 0, transition },
  exit: {
    opacity: 0,
    x: -20,
    transition
  }
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.05
}

export const SlideTransition = ({
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
