import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'

export const KeepKeyConfig = {
  adapter: WebUSBKeepKeyAdapter,
  mobileEnabled: true,
  icon: KeepKeyIcon,
  name: 'KeepKey',
}
