import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from 'components/Icons/FoxIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type MobileConfigType = Omit<SupportedWalletInfo<typeof NativeAdapter>, 'routes'>

export const MobileConfig: MobileConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-native').then(m => m.NativeAdapter),
    },
  ],

  supportsMobile: 'app',
  icon: FoxIcon,
  name: 'ShapeShift Mobile',
}
