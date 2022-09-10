import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const DemoConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: NativeAdapter,
  supportsMobile: 'both',
  icon: FoxIcon,
  name: 'DemoWallet',
}
