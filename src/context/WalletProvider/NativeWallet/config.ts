import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type NativeConfigType = Omit<SupportedWalletInfo<typeof NativeAdapter>, 'routes'>

export const NativeConfig: NativeConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-native').then(m => m.NativeAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: FoxIcon,
  name: 'ShapeShift',
}
