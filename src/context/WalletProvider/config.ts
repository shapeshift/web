import { ComponentWithAs, IconProps } from '@chakra-ui/react'
// import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import * as keepkeyTcp from '@shapeshiftoss/hdwallet-keepkey-tcp'
import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { PortisAdapter } from '@shapeshiftoss/hdwallet-portis'
import { RouteProps } from 'react-router-dom'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import { PortisIcon } from 'components/Icons/PortisIcon'

import { KeepKeyConnect } from './KeepKey/components/Connect'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { MetaMaskConnect } from './MetaMask/components/Connect'
import { MetaMaskFailure } from './MetaMask/components/Failure'
import { MetaMaskSuccess } from './MetaMask/components/Success'
import { NativeCreate } from './NativeWallet/components/NativeCreate'
import { NativeImport } from './NativeWallet/components/NativeImport'
import { NativeLoad } from './NativeWallet/components/NativeLoad'
import { NativePassword } from './NativeWallet/components/NativePassword'
import { NativeRename } from './NativeWallet/components/NativeRename'
import { NativeStart } from './NativeWallet/components/NativeStart'
import { NativeSuccess } from './NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from './NativeWallet/components/NativeTestPhrase'
import { PortisConnect } from './Portis/components/Connect'
import { PortisFailure } from './Portis/components/Failure'
import { PortisSuccess } from './Portis/components/Success'

export interface SupportedWalletInfo {
  adapter: any
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  routes: RouteProps[]
}

export enum KeyManager {
  KeepKey = 'keepkey',
  Native = 'native',
  MetaMask = 'metamask',
  Portis = 'portis'
}

export const SUPPORTED_WALLETS: Record<KeyManager, SupportedWalletInfo> = {
  [KeyManager.KeepKey]: {
    adapter: keepkeyTcp.TCPKeepKeyAdapter,
    icon: KeepKeyIcon,
    name: 'KeepKey',
    routes: [
      { path: '/keepkey/connect', component: KeepKeyConnect },
      { path: '/keepkey/success', component: KeepKeySuccess }
    ]
  },
  [KeyManager.Native]: {
    adapter: NativeAdapter,
    icon: FoxIcon,
    name: 'ShapeShift',
    routes: [
      { path: '/native/connect', component: NativeStart },
      { path: '/native/load', component: NativeLoad },
      { path: '/native/password', component: NativePassword },
      { path: '/native/rename', component: NativeRename },
      { path: '/native/import', component: NativeImport },
      { path: '/native/create', component: NativeCreate },
      { path: '/native/create-test', component: NativeTestPhrase },
      { path: '/native/success', component: NativeSuccess }
    ]
  },
  [KeyManager.MetaMask]: {
    adapter: MetaMaskAdapter,
    icon: MetaMaskIcon,
    name: 'MetaMask',
    routes: [
      { path: '/metamask/connect', component: MetaMaskConnect },
      { path: '/metamask/success', component: MetaMaskSuccess },
      { path: '/metamask/failure', component: MetaMaskFailure }
    ]
  },
  [KeyManager.Portis]: {
    adapter: PortisAdapter,
    icon: PortisIcon,
    name: 'Portis',
    routes: [
      { path: '/portis/connect', component: PortisConnect },
      { path: '/portis/success', component: PortisSuccess },
      { path: '/portis/failure', component: PortisFailure }
    ]
  }
}
