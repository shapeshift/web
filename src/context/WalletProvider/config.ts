import { ComponentWithAs, IconProps } from '@chakra-ui/react'
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
  adapter: Promise<any>
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  routes: RouteProps[]
}

export enum KeyManager {
  Native = 'native',
  KeepKey = 'keepkey',
  MetaMask = 'metamask',
  Portis = 'portis'
}

export const SUPPORTED_WALLETS: Record<KeyManager, SupportedWalletInfo> = {
  [KeyManager.Native]: {
    adapter: import('@shapeshiftoss/hdwallet-native').then(x => x.NativeAdapter),
    icon: FoxIcon,
    name: 'ShapeShift',
    routes: [
      { path: '/native/start', component: NativeStart },
      { path: '/native/load', component: NativeLoad },
      { path: '/native/password', component: NativePassword },
      { path: '/native/rename', component: NativeRename },
      { path: '/native/import', component: NativeImport },
      { path: '/native/create', component: NativeCreate },
      { path: '/native/create-test', component: NativeTestPhrase },
      { path: '/native/success', component: NativeSuccess }
    ]
  },
  [KeyManager.KeepKey]: {
    adapter: import('@shapeshiftoss/hdwallet-keepkey-webusb').then(x => x.WebUSBKeepKeyAdapter),
    icon: KeepKeyIcon,
    name: 'KeepKey',
    routes: [
      { path: '/keepkey/connect', component: KeepKeyConnect },
      { path: '/keepkey/success', component: KeepKeySuccess }
    ]
  },
  [KeyManager.MetaMask]: {
    adapter: import('@shapeshiftoss/hdwallet-metamask').then(x => x.MetaMaskAdapter),
    icon: MetaMaskIcon,
    name: 'MetaMask',
    routes: [
      { path: '/metamask/connect', component: MetaMaskConnect },
      { path: '/metamask/success', component: MetaMaskSuccess },
      { path: '/metamask/failure', component: MetaMaskFailure }
    ]
  },
  [KeyManager.Portis]: {
    adapter: import('@shapeshiftoss/hdwallet-portis').then(x => x.PortisAdapter),
    icon: PortisIcon,
    name: 'Portis',
    routes: [
      { path: '/portis/connect', component: PortisConnect },
      { path: '/portis/success', component: PortisSuccess },
      { path: '/portis/failure', component: PortisFailure }
    ]
  }
}
