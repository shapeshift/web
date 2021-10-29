import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { RouteProps } from 'react-router-dom'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { ShapeShiftVertical } from 'components/Icons/SSVerticalIcon'

import { KeepKeyConnect } from './KeepKey/components/Connect'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { NativeImport } from './NativeWallet/components/NativeImport'
import { NativePassword } from './NativeWallet/components/NativePassword'
import { NativeSeed } from './NativeWallet/components/NativeSeed/NativeSeed'
import { NativeStart } from './NativeWallet/components/NativeStart'
import { NativeSuccess } from './NativeWallet/components/NativeSuccess/NativeSuccess'
import { NativeTestPhrase } from './NativeWallet/components/NativeTestPhrase/NativeTestPhrase'

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
    routes: [
      { path: '/keepkey/connect', component: KeepKeyConnect },
      { path: '/keepkey/success', component: KeepKeySuccess }
    ]
  }
}
