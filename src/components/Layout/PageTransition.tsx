import { HTMLMotionProps, motion } from 'framer-motion'

export const PageTransition = (props: HTMLMotionProps<'div'>) => (
  <motion.div
    initial={{ y: -16, opacity: 0, minHeight: 'calc(100vh - 70px)' }}
    animate={{ y: 0, opacity: 1 }}
    transition={{
      delay: 0.35,
      duration: 0.2
    }}
    {...props}
  />
)
