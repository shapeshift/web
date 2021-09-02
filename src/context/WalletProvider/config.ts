import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { ShapeShiftVertical } from 'components/Icons/SSVerticalIcon'
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
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  routes: RouteProps[]
}

export const SUPPORTED_WALLETS: { [key: string]: SupportedWalletInfo } = {
  native: {
    adapter: NativeAdapter,
    icon: ShapeShiftVertical,
    name: 'ShapeShift',
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
    icon: KeepKeyIcon,
    name: 'KeepKey',
    routes: [{ path: '/keepkey/pin', component: PinModal }]
  }
}
