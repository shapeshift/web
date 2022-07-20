import { useMediaQuery } from '@chakra-ui/media-query'
import { HTMLMotionProps, motion } from 'framer-motion'
import { DemoConfig } from 'context/WalletProvider/DemoWallet/config'
import { useWallet } from 'hooks/useWallet/useWallet'
import { breakpoints } from 'theme/theme'

export const PageTransition: React.FC<HTMLMotionProps<'div'>> = props => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const walletContext = useWallet()
  const minHeight = isLargerThanMd
    ? `calc(100vh - ${
        walletContext?.state?.walletInfo?.deviceId === DemoConfig.name ? '7rem' : '4.5rem'
      })`
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
