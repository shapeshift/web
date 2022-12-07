import { useMediaQuery } from '@chakra-ui/media-query'
import type { HTMLMotionProps } from 'framer-motion'
import { motion } from 'framer-motion'
import { useWallet } from 'hooks/useWallet/useWallet'
import { breakpoints } from 'theme/theme'

export const PageTransition: React.FC<HTMLMotionProps<'div'>> = props => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const walletContext = useWallet()
  const minHeight = isLargerThanMd
    ? `calc(100vh - ${walletContext?.state?.isDemoWallet ? '7rem' : '4.5rem'})`
    : 'auto'

  return (
    <motion.div
      initial={{ y: -16, opacity: 0, minHeight }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: 0.35,
        duration: 0.2,
      }}
      {...props}
    />
  )
}
