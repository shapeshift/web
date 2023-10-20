import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type DemoConfigType = Omit<SupportedWalletInfo<typeof NativeAdapter>, 'routes'>

export const DemoConfig: DemoConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-native').then(m => m.NativeAdapter),
    },
  ],
  supportsMobile: 'both',
  icon: FoxIcon,
  name: 'DemoWallet',
}
