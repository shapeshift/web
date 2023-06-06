import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const MobileConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [NativeAdapter],
  supportsMobile: 'app',
  icon: FoxIcon,
  name: 'ShapeShift Mobile',
}
