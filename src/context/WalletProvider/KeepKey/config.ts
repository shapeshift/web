import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'

export const KeepKeyConfig = {
  adapter: WebUSBKeepKeyAdapter,
  icon: KeepKeyIcon,
  name: 'KeepKey',
}
