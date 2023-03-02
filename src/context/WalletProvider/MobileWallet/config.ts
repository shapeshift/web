import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'
import { logger } from 'lib/logger'

export const MobileConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: NativeAdapter,
  supportsMobile: 'app',
  icon: FoxIcon,
  name: 'ShapeShift Mobile',
}

/**
 * A logger with a namespace so components can make child loggers on one line
 * (no need to repeat this part of the namespace in each child)
 */
export const mobileLogger = logger.child({
  namespace: ['WalletProvider', 'MobileWallet'],
})
