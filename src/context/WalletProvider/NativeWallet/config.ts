import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SupportedWalletInfo } from 'context/WalletProvider/config'

export const NativeConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: NativeAdapter,
  supportsMobile: 'both',
  icon: FoxIcon,
  name: 'ShapeShift',
}
