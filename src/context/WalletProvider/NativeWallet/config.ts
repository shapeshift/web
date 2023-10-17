import { FoxIcon } from 'components/Icons/FoxIcon' // Ensure the import path is correct
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const NativeConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-native').then(m => m.NativeAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: FoxIcon,
  name: 'ShapeShift',
}
