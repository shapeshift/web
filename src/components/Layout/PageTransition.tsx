import { useMediaQuery } from '@chakra-ui/media-query'
import { HTMLMotionProps, motion } from 'framer-motion'
import { breakpoints } from 'theme/theme'

export const PageTransition = (props: HTMLMotionProps<'div'>) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  return (
    <motion.div
      initial={{ y: -16, opacity: 0, minHeight: isLargerThanMd ? 'calc(100vh - 70px)' : 'auto' }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: 0.35,
        duration: 0.2
      }}
      {...props}
    />
  )
}
