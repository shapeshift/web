import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type KeepKeyConfigType = Omit<
  SupportedWalletInfo<typeof KkRestAdapter | typeof WebUSBKeepKeyAdapter>,
  'routes'
>

export const KeepKeyConfig: KeepKeyConfigType = {
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
