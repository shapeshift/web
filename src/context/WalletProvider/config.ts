import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import type { RouteProps } from 'react-router-dom'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { ChangeLabel } from 'components/Layout/Header/NavBar/KeepKey/ChangeLabel'
import { ChangePassphrase } from 'components/Layout/Header/NavBar/KeepKey/ChangePassphrase'
import { ChangePin } from 'components/Layout/Header/NavBar/KeepKey/ChangePin'
import { ChangeTimeout } from 'components/Layout/Header/NavBar/KeepKey/ChangeTimeout'
import { KeepKeyMenu } from 'components/Layout/Header/NavBar/KeepKey/KeepKeyMenu'
import { NativeMenu } from 'components/Layout/Header/NavBar/Native/NativeMenu'
import { KeepKeyFactoryState } from 'context/WalletProvider/KeepKey/components/FactoryState'
import { KeepKeyLabel } from 'context/WalletProvider/KeepKey/components/Label'
import { KeepKeyRecoverySentence } from 'context/WalletProvider/KeepKey/components/RecoverySentence'
import { KeepKeyRecoverySentenceEntry } from 'context/WalletProvider/KeepKey/components/RecoverySentenceEntry'
import { KeepKeyRecoverySentenceInvalid } from 'context/WalletProvider/KeepKey/components/RecoverySentenceInvalid'
import { KeepKeyRecoverySettings } from 'context/WalletProvider/KeepKey/components/RecoverySettings'
import { RecoverySettingUp } from 'context/WalletProvider/KeepKey/components/RecoverySettingUp'
import { KeepKeyRoutes } from 'context/WalletProvider/routes'

import { DemoConfig } from './DemoWallet/config'
import { KeepKeyConnect } from './KeepKey/components/Connect'
import { KeepKeyPassphrase } from './KeepKey/components/Passphrase'
import { KeepKeyPin } from './KeepKey/components/Pin'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { KeepKeyConfig } from './KeepKey/config'
import { KeplrConnect } from './Keplr/components/Connect'
import { KeplrFailure } from './Keplr/components/Failure'
import { KeplrConfig } from './Keplr/config'
import { KeyManager } from './KeyManager'
import { MetaMaskConnect } from './MetaMask/components/Connect'
import { MetaMaskFailure } from './MetaMask/components/Failure'
import { MetaMaskConfig } from './MetaMask/config'
import { MobileCreate } from './MobileWallet/components/MobileCreate'
import { MobileImport } from './MobileWallet/components/MobileImport'
import { MobileLoad } from './MobileWallet/components/MobileLoad'
import { MobileRename } from './MobileWallet/components/MobileRename'
import { MobileStart } from './MobileWallet/components/MobileStart'
import { MobileSuccess } from './MobileWallet/components/MobileSuccess'
import { MobileTestPhrase } from './MobileWallet/components/MobileTestPhrase'
import { MobileConfig } from './MobileWallet/config'
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
import { TallyHoConnect } from './TallyHo/components/Connect'
import { TallyHoFailure } from './TallyHo/components/Failure'
import { TallyHoConfig } from './TallyHo/config'
import { WalletConnectConnect } from './WalletConnect/components/Connect'
import { WalletConnectFailure } from './WalletConnect/components/Failure'
import { WalletConnectConfig } from './WalletConnect/config'
import { XDEFIConnect } from './XDEFI/components/Connect'
import { XDEFIFailure } from './XDEFI/components/Failure'
import { XDEFIConfig } from './XDEFI/config'

export interface SupportedWalletInfo {
  adapter: any
  supportsMobile?: 'browser' | 'app' | 'both'
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  routes: RouteProps[]
  connectedWalletMenuRoutes?: RouteProps[]
  connectedWalletMenuInitialPath?: WalletConnectedRoutes
}

export const SUPPORTED_WALLETS: Record<KeyManager, SupportedWalletInfo> = {
  [KeyManager.Mobile]: {
    ...MobileConfig,
    routes: [
      { path: '/mobile/connect', component: MobileStart },
      { path: '/mobile/load', component: MobileLoad },
      { path: '/mobile/rename', component: MobileRename },
      { path: '/mobile/import', component: MobileImport },
      { path: '/mobile/create', component: MobileCreate },
      { path: '/mobile/create-test', component: MobileTestPhrase },
      { path: '/mobile/success', component: MobileSuccess },
    ],
    // @TODO: Update
    connectedWalletMenuRoutes: [{ path: WalletConnectedRoutes.Native, component: NativeMenu }],
    connectedWalletMenuInitialPath: WalletConnectedRoutes.Native,
  },
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
    connectedWalletMenuRoutes: [{ path: WalletConnectedRoutes.Native, component: NativeMenu }],
    connectedWalletMenuInitialPath: WalletConnectedRoutes.Native,
  },
  [KeyManager.KeepKey]: {
    ...KeepKeyConfig,
    routes: [
      { path: KeepKeyRoutes.Connect, component: KeepKeyConnect },
      { path: KeepKeyRoutes.Success, component: KeepKeySuccess },
      { path: KeepKeyRoutes.Pin, component: KeepKeyPin },
      { path: KeepKeyRoutes.Passphrase, component: KeepKeyPassphrase },
      { path: KeepKeyRoutes.FactoryState, component: KeepKeyFactoryState },
      { path: KeepKeyRoutes.NewLabel, component: KeepKeyLabel },
      { path: KeepKeyRoutes.NewRecoverySentence, component: KeepKeyRecoverySentence },
      { path: KeepKeyRoutes.RecoverySentenceEntry, component: KeepKeyRecoverySentenceEntry },
      { path: KeepKeyRoutes.RecoverySettings, component: KeepKeyRecoverySettings },
      { path: KeepKeyRoutes.RecoverySettingUp, component: RecoverySettingUp },
      { path: KeepKeyRoutes.RecoverySentenceInvalid, component: KeepKeyRecoverySentenceInvalid },
    ],
    connectedWalletMenuRoutes: [
      { path: WalletConnectedRoutes.KeepKey, component: KeepKeyMenu },
      { path: WalletConnectedRoutes.KeepKeyLabel, component: ChangeLabel },
      { path: WalletConnectedRoutes.KeepKeyPin, component: ChangePin },
      { path: WalletConnectedRoutes.KeepKeyTimeout, component: ChangeTimeout },
      { path: WalletConnectedRoutes.KeepKeyPassphrase, component: ChangePassphrase },
    ],
    connectedWalletMenuInitialPath: WalletConnectedRoutes.KeepKey,
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
  [KeyManager.TallyHo]: {
    ...TallyHoConfig,
    routes: [
      { path: '/tallyho/connect', component: TallyHoConnect },
      { path: '/tallyho/failure', component: TallyHoFailure },
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
  [KeyManager.WalletConnect]: {
    ...WalletConnectConfig,
    routes: [
      { path: '/walletconnect/connect', component: WalletConnectConnect },
      { path: '/walletconnect/failure', component: WalletConnectFailure },
    ],
  },
  [KeyManager.Keplr]: {
    ...KeplrConfig,
    routes: [
      { path: '/keplr/connect', component: KeplrConnect },
      { path: '/keplr/failure', component: KeplrFailure },
    ],
  },
}
