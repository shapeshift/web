import { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const KeepKeyConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: [KkRestAdapter, WebUSBKeepKeyAdapter],
  icon: KeepKeyIcon,
  name: 'KeepKey',
}
