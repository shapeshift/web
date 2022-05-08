import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { RouteProps } from 'react-router-dom'
import { KeepKeyLabel } from 'context/WalletProvider/KeepKey/components/Label'
import { KeepKeyRecoverySentence } from 'context/WalletProvider/KeepKey/components/RecoverySentence'
import { KeepKeyRecoverySentenceEntry } from 'context/WalletProvider/KeepKey/components/RecoverySentenceEntry'
import { KeepKeyRecoverySentenceInvalid } from 'context/WalletProvider/KeepKey/components/RecoverySentenceInvalid'
import { KeepKeyRecoverySettings } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { RecoverySettingUp } from 'context/WalletProvider/KeepKey/components/RecoverySettingUp'
import { WipedSuccessfully } from 'context/WalletProvider/KeepKey/components/WipedSuccessfully'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

import { DemoConfig } from './DemoWallet/config'
import { KeepKeyConnect } from './KeepKey/components/Connect'
import { KeepKeyPassphrase } from './KeepKey/components/Passphrase'
import { KeepKeyPin } from './KeepKey/components/Pin'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { KeepKeyConfig } from './KeepKey/config'
import { KeyManager } from './KeyManager'
import { MetaMaskConnect } from './MetaMask/components/Connect'
import { MetaMaskFailure } from './MetaMask/components/Failure'
import { MetaMaskConfig } from './MetaMask/config'
import { EnterPassword } from './NativeWallet/components/EnterPassword'
import { LegacyLogin } from './NativeWallet/components/LegacyLogin'
import { LegacyLoginSuccess } from './NativeWallet/components/LegacyLoginSuccess'
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
import { PortisConfig } from './Portis/config'
import { XDEFIConnect } from './XDEFI/components/Connect'
import { XDEFIFailure } from './XDEFI/components/Failure'
import { XDEFIConfig } from './XDEFI/config'
import { KeplrConnect } from './Keplr/components/Connect'
import { KeplrFailure } from './Keplr/components/Failure'
import { KeplrConfig } from './Keplr/config'

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
      { path: '/native/legacy/login', component: LegacyLogin },
      { path: '/native/legacy/login/success', component: LegacyLoginSuccess },
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
      { path: KeepKeyRoutes.RecoverySentenceEntry, component: KeepKeyRecoverySentenceEntry },
      { path: KeepKeyRoutes.RecoverySettings, component: KeepKeyRecoverySettings },
      { path: KeepKeyRoutes.RecoverySettingUp, component: RecoverySettingUp },
      { path: KeepKeyRoutes.RecoverySentenceInvalid, component: KeepKeyRecoverySentenceInvalid },
    ],
  },
  [KeyManager.MetaMask]: {
    ...MetaMaskConfig,
    routes: [
      { path: '/metamask/connect', component: MetaMaskConnect },
      { path: '/metamask/failure', component: MetaMaskFailure },
    ],
  },
  [KeyManager.Portis]: {
    ...PortisConfig,
    routes: [
      { path: '/portis/connect', component: PortisConnect },
      { path: '/portis/failure', component: PortisFailure },
    ],
  },
  [KeyManager.XDefi]: {
    ...XDEFIConfig,
    routes: [
      { path: '/xdefi/connect', component: XDEFIConnect },
      { path: '/xdefi/failure', component: XDEFIFailure },
    ],
  },
  [KeyManager.Demo]: {
    ...DemoConfig,
    routes: [],
  },
  [KeyManager.Keplr]: {
    ...KeplrConfig,
    routes: [
      { path: '/Keplr/connect', component: KeplrConnect },
      { path: '/Keplr/failure', component: KeplrFailure },
    ],
  },
}
