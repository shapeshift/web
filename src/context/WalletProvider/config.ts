import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { RouteProps } from 'react-router-dom'
import { KeepKeyLabel } from 'context/WalletProvider/KeepKey/components/Label'
import { KeepKeyRecoverySentence } from 'context/WalletProvider/KeepKey/components/RecoverySentence'
import { WipedSuccessfully } from 'context/WalletProvider/KeepKey/components/WipedSuccessfully'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

import { KeepKeyConnect } from './KeepKey/components/Connect'
import { KeepKeyPassphrase } from './KeepKey/components/Passphrase'
import { KeepKeyPin } from './KeepKey/components/Pin'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { KeepKeyConfig } from './KeepKey/config'
import { KeyManager } from './KeyManager'
import { MetaMaskConnect } from './MetaMask/components/Connect'
import { MetaMaskFailure } from './MetaMask/components/Failure'
import { MetaMaskSuccess } from './MetaMask/components/Success'
import { MetaMaskConfig } from './MetaMask/config'
import { EnterPassword } from './NativeWallet/components/EnterPassword'
import { NativeCreate } from './NativeWallet/components/NativeCreate'
import { NativeImport } from './NativeWallet/components/NativeImport'
import { NativeLoad } from './NativeWallet/components/NativeLoad'
import { NativePassword } from './NativeWallet/components/NativePassword'
import { NativeRename } from './NativeWallet/components/NativeRename'
import { NativeStart } from './NativeWallet/components/NativeStart'
import { NativeSuccess } from './NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from './NativeWallet/components/NativeTestPhrase'
import { NativeConfig } from './NativeWallet/config'
import { PortisConnect } from './Portis/components/Connect'
import { PortisFailure } from './Portis/components/Failure'
import { PortisSuccess } from './Portis/components/Success'
import { PortisConfig } from './Portis/config'

export interface SupportedWalletInfo {
  adapter: any
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  routes: RouteProps[]
}

export const SUPPORTED_WALLETS: Record<KeyManager, SupportedWalletInfo> = {
  [KeyManager.Native]: {
    ...NativeConfig,
    routes: [
      { path: '/native/connect', component: NativeStart },
      { path: '/native/load', component: NativeLoad },
      { path: '/native/password', component: NativePassword },
      { path: '/native/rename', component: NativeRename },
      { path: '/native/import', component: NativeImport },
      { path: '/native/create', component: NativeCreate },
      { path: '/native/create-test', component: NativeTestPhrase },
      { path: '/native/success', component: NativeSuccess },
      { path: '/native/enter-password', component: EnterPassword },
    ],
  },
  [KeyManager.KeepKey]: {
    ...KeepKeyConfig,
    routes: [
      { path: KeepKeyRoutes.Connect, component: KeepKeyConnect },
      { path: KeepKeyRoutes.Success, component: KeepKeySuccess },
      { path: KeepKeyRoutes.Pin, component: KeepKeyPin },
      { path: KeepKeyRoutes.Passphrase, component: KeepKeyPassphrase },
      { path: KeepKeyRoutes.WipeSuccessful, component: WipedSuccessfully },
      { path: KeepKeyRoutes.NewLabel, component: KeepKeyLabel },
      { path: KeepKeyRoutes.NewRecoverySentence, component: KeepKeyRecoverySentence },
    ],
  },
  [KeyManager.MetaMask]: {
    ...MetaMaskConfig,
    routes: [
      { path: '/metamask/connect', component: MetaMaskConnect },
      { path: '/metamask/success', component: MetaMaskSuccess },
      { path: '/metamask/failure', component: MetaMaskFailure },
    ],
  },
  [KeyManager.Portis]: {
    ...PortisConfig,
    routes: [
      { path: '/portis/connect', component: PortisConnect },
      { path: '/portis/success', component: PortisSuccess },
      { path: '/portis/failure', component: PortisFailure },
    ],
  },
}
