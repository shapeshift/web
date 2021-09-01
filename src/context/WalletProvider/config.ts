import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import KEEPKEY_ICON from 'assets/svg/keepkey-logo.svg'
import SS_NATIVE_ICON from 'assets/svg/sswallet.svg'
import { RouteProps } from 'react-router-dom'

import { PinModal } from './KeepKey/PinModal'
import { NativeImport } from './NativeWallet/NativeImport'
import { NativePassword } from './NativeWallet/NativePassword'
import { NativeSeed } from './NativeWallet/NativeSeed'
import { NativeStart } from './NativeWallet/NativeStart'
import { NativeSuccess } from './NativeWallet/NativeSuccess'
import { NativeTestPhrase } from './NativeWallet/NativeTestPhrase'

export interface SupportedWalletInfo {
  adapter: any
  icon: string
  name: string
  init: (keyring: Keyring) => NativeAdapter
  setup: () => any
  routes: RouteProps[]
}

export const SUPPORTED_WALLETS: { [key: string]: SupportedWalletInfo } = {
  native: {
    adapter: NativeAdapter,
    icon: SS_NATIVE_ICON,
    name: 'ShapeShift',
    init: NativeAdapter.useKeyring,
    setup: () => {},
    routes: [
      { path: '/native/password', component: NativePassword },
      { path: '/native/start', component: NativeStart },
      { path: '/native/seed', component: NativeSeed },
      { path: '/native/import', component: NativeImport },
      { path: '/native/seed-test', component: NativeTestPhrase },
      { path: '/native/success', component: NativeSuccess }
    ]
  },
  keepkey: {
    adapter: WebUSBKeepKeyAdapter,
    icon: KEEPKEY_ICON,
    name: 'KeepKey',
    init: WebUSBKeepKeyAdapter.useKeyring,
    setup: () => {},
    routes: [{ path: '/keepkey/pin', component: PinModal }]
  }
}
