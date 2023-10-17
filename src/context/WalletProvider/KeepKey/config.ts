import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const KeepKeyConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () => import('@keepkey/hdwallet-keepkey-rest').then(m => m.KkRestAdapter),
    },
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-keepkey-webusb').then(m => m.WebUSBKeepKeyAdapter),
    },
  ],
  icon: KeepKeyIcon,
  name: 'KeepKey',
}
