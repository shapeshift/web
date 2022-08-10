import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SupportedWalletInfo } from 'context/WalletProvider/config'

export const MobileConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: NativeAdapter,
  supportsMobile: 'app',
  icon: FoxIcon,
  name: 'ShapeShift Mobile',
}
