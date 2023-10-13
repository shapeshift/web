import { FoxIcon } from 'components/Icons/FoxIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const DemoConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-native').then(m => m.NativeAdapter),
    },
  ],
  supportsMobile: 'both',
  icon: FoxIcon,
  name: 'DemoWallet',
}
