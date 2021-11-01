import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { PortisAdapter } from '@shapeshiftoss/hdwallet-portis'
import { RouteProps } from 'react-router-dom'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import { PortisIcon } from 'components/Icons/PortisIcon'
import { ShapeShiftVertical } from 'components/Icons/SSVerticalIcon'

import { PinModal } from './KeepKey/PinModal'
import { MetaStart } from './MetaMask/components/MetaStart'
import { MetaSuccess } from './MetaMask/components/MetaSuccess'
import { NativeImport } from './NativeWallet/components/NativeImport'
import { NativePassword } from './NativeWallet/components/NativePassword'
import { NativeSeed } from './NativeWallet/components/NativeSeed/NativeSeed'
import { NativeStart } from './NativeWallet/components/NativeStart'
import { NativeSuccess } from './NativeWallet/components/NativeSuccess/NativeSuccess'
import { NativeTestPhrase } from './NativeWallet/components/NativeTestPhrase/NativeTestPhrase'
import { PortisStart } from './Portis/components/PortisStart'
import { PortisSuccess } from './Portis/components/PortisSuccess'

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
  },
  metamask: {
    adapter: MetaMaskAdapter,
    icon: MetaMaskIcon,
    name: 'MetaMask',
    routes: [
      { path: '/metamask/start', component: MetaStart },
      { path: '/metamask/success', component: MetaSuccess }
    ]
  },
  portis: {
    adapter: PortisAdapter,
    icon: PortisIcon,
    name: 'Portis',
    routes: [
      { path: '/portis/start', component: PortisStart },
      { path: '/portis/success', component: PortisSuccess }
    ]
  }
}
