import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SupportedWalletInfo } from 'context/WalletProvider/config'
import { logger } from 'lib/logger'

export const MobileConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: NativeAdapter,
  supportsMobile: 'app',
  icon: FoxIcon,
  name: 'ShapeShift Mobile',
}

export const mobileLogger = logger.child({
  namespace: ['WalletProvider', 'MobileWallet'],
})
