import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import type { KeplrAdapter } from '@shapeshiftoss/hdwallet-keplr'
import type { WebUSBLedgerAdapter as LedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import type { PhantomAdapter } from '@shapeshiftoss/hdwallet-phantom'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import { lazy } from 'react'
import type { RouteProps } from 'react-router-dom'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { walletConnectV2ProviderConfig } from 'context/WalletProvider/WalletConnectV2/config'

import { DemoConfig } from './DemoWallet/config'
import { DemoMenu } from './DemoWallet/DemoMenu'
import { KeepKeyConnectedMenuItems } from './KeepKey/components/KeepKeyMenu'
import { KeepKeyConfig } from './KeepKey/config'
import { KeplrConfig } from './Keplr/config'
import { KeyManager } from './KeyManager'
import { LedgerConfig } from './Ledger/config'
import { MetaMaskConfig } from './MetaMask/config'
import { MobileConfig } from './MobileWallet/config'
import { NativeConfig } from './NativeWallet/config'
import { PhantomConfig } from './Phantom/config'
import { KeepKeyRoutes } from './routes'
import { NativeWalletRoutes } from './types'
import { WalletConnectV2Config } from './WalletConnectV2/config'
import type { EthereumProviderOptions } from './WalletConnectV2/constants'

const WalletConnectV2Connect = lazy(() =>
  import('./WalletConnectV2/components/Connect').then(({ WalletConnectV2Connect }) => ({
    default: WalletConnectV2Connect,
  })),
)

const NativeTestPhrase = lazy(() =>
  import('./NativeWallet/components/NativeTestPhrase').then(({ NativeTestPhrase }) => ({
    default: NativeTestPhrase,
  })),
)
const NativeSuccess = lazy(() =>
  import('./NativeWallet/components/NativeSuccess').then(({ NativeSuccess }) => ({
    default: NativeSuccess,
  })),
)
const NativeStart = lazy(() =>
  import('./NativeWallet/components/NativeStart').then(({ NativeStart }) => ({
    default: NativeStart,
  })),
)
const NativeRename = lazy(() =>
  import('./NativeWallet/components/NativeRename').then(({ NativeRename }) => ({
    default: NativeRename,
  })),
)
const NativePassword = lazy(() =>
  import('./NativeWallet/components/NativePassword').then(({ NativePassword }) => ({
    default: NativePassword,
  })),
)
const NativeLegacySuccess = lazy(() =>
  import('./NativeWallet/components/NativeLegacySuccess').then(({ NativeLegacySuccess }) => ({
    default: NativeLegacySuccess,
  })),
)
const NativeLoad = lazy(() =>
  import('./NativeWallet/components/NativeLoad').then(({ NativeLoad }) => ({
    default: NativeLoad,
  })),
)
const NativeCreate = lazy(() =>
  import('./NativeWallet/components/NativeCreate').then(({ NativeCreate }) => ({
    default: NativeCreate,
  })),
)
const NativeImport = lazy(() =>
  import('./NativeWallet/components/NativeImport').then(({ NativeImport }) => ({
    default: NativeImport,
  })),
)
const NativeLegacyLogin = lazy(() =>
  import('./NativeWallet/components/NativeLegacyLogin').then(({ NativeLegacyLogin }) => ({
    default: NativeLegacyLogin,
  })),
)
const EnterPassword = lazy(() =>
  import('./NativeWallet/components/EnterPassword').then(({ EnterPassword }) => ({
    default: EnterPassword,
  })),
)
const SnapInstall = lazy(() =>
  import('./MetaMask/components/SnapInstall').then(({ SnapInstall }) => ({ default: SnapInstall })),
)

const SnapUpdate = lazy(() =>
  import('./MetaMask/components/SnapUpdate').then(({ SnapUpdate }) => ({ default: SnapUpdate })),
)

const ChangeLabel = lazy(() =>
  import('components/Layout/Header/NavBar/KeepKey/ChangeLabel').then(({ ChangeLabel }) => ({
    default: ChangeLabel,
  })),
)
const ChangePassphrase = lazy(() =>
  import('components/Layout/Header/NavBar/KeepKey/ChangePassphrase').then(
    ({ ChangePassphrase }) => ({ default: ChangePassphrase }),
  ),
)
const ChangePin = lazy(() =>
  import('components/Layout/Header/NavBar/KeepKey/ChangePin').then(({ ChangePin }) => ({
    default: ChangePin,
  })),
)
const ChangeTimeout = lazy(() =>
  import('components/Layout/Header/NavBar/KeepKey/ChangeTimeout').then(({ ChangeTimeout }) => ({
    default: ChangeTimeout,
  })),
)
const KeepKeyMenu = lazy(() =>
  import('components/Layout/Header/NavBar/KeepKey/KeepKeyMenu').then(({ KeepKeyMenu }) => ({
    default: KeepKeyMenu,
  })),
)
const NativeMenu = lazy(() =>
  import('components/Layout/Header/NavBar/Native/NativeMenu').then(({ NativeMenu }) => ({
    default: NativeMenu,
  })),
)
const KeepKeyConnect = lazy(() =>
  import('./KeepKey/components/Connect').then(({ KeepKeyConnect }) => ({
    default: KeepKeyConnect,
  })),
)
const KeepKeyDisconnect = lazy(() =>
  import('./KeepKey/components/Disconnect').then(({ KeepKeyDisconnect }) => ({
    default: KeepKeyDisconnect,
  })),
)
const KeepKeyDownloadUpdaterApp = lazy(() =>
  import('./KeepKey/components/DownloadUpdaterApp').then(({ KeepKeyDownloadUpdaterApp }) => ({
    default: KeepKeyDownloadUpdaterApp,
  })),
)
const KeepKeyFactoryState = lazy(() =>
  import('./KeepKey/components/FactoryState').then(({ KeepKeyFactoryState }) => ({
    default: KeepKeyFactoryState,
  })),
)
const KeepKeyLabel = lazy(() =>
  import('./KeepKey/components/Label').then(({ KeepKeyLabel }) => ({ default: KeepKeyLabel })),
)
const KeepKeyPassphrase = lazy(() =>
  import('./KeepKey/components/Passphrase').then(({ KeepKeyPassphrase }) => ({
    default: KeepKeyPassphrase,
  })),
)
const KeepKeyPinModal = lazy(() =>
  import('./KeepKey/components/PinModal').then(({ KeepKeyPinModal }) => ({
    default: KeepKeyPinModal,
  })),
)
const KeepKeyRecoverySentence = lazy(() =>
  import('./KeepKey/components/RecoverySentence').then(({ KeepKeyRecoverySentence }) => ({
    default: KeepKeyRecoverySentence,
  })),
)
const KeepKeyRecoverySentenceEntry = lazy(() =>
  import('./KeepKey/components/RecoverySentenceEntry').then(({ KeepKeyRecoverySentenceEntry }) => ({
    default: KeepKeyRecoverySentenceEntry,
  })),
)
const KeepKeyRecoverySentenceInvalid = lazy(() =>
  import('./KeepKey/components/RecoverySentenceInvalid').then(
    ({ KeepKeyRecoverySentenceInvalid }) => ({ default: KeepKeyRecoverySentenceInvalid }),
  ),
)
const KeepKeyRecoverySettings = lazy(() =>
  import('./KeepKey/components/RecoverySettings').then(({ KeepKeyRecoverySettings }) => ({
    default: KeepKeyRecoverySettings,
  })),
)
const RecoverySettingUp = lazy(() =>
  import('./KeepKey/components/RecoverySettingUp').then(({ RecoverySettingUp }) => ({
    default: RecoverySettingUp,
  })),
)
const KeepKeySuccess = lazy(() =>
  import('./KeepKey/components/Success').then(({ KeepKeySuccess }) => ({
    default: KeepKeySuccess,
  })),
)
const KeplrConnect = lazy(() =>
  import('./Keplr/components/Connect').then(({ KeplrConnect }) => ({ default: KeplrConnect })),
)
const KeplrFailure = lazy(() =>
  import('./Keplr/components/Failure').then(({ KeplrFailure }) => ({ default: KeplrFailure })),
)
const LedgerChains = lazy(() =>
  import('./Ledger/components/Chains').then(({ LedgerChains }) => ({ default: LedgerChains })),
)
const LedgerConnect = lazy(() =>
  import('./Ledger/components/Connect').then(({ LedgerConnect }) => ({ default: LedgerConnect })),
)
const LedgerFailure = lazy(() =>
  import('./Ledger/components/Failure').then(({ LedgerFailure }) => ({ default: LedgerFailure })),
)
const LedgerSuccess = lazy(() =>
  import('./Ledger/components/Success').then(({ LedgerSuccess }) => ({ default: LedgerSuccess })),
)
const MetaMaskConnect = lazy(() =>
  import('./MetaMask/components/Connect').then(({ MetaMaskConnect }) => ({
    default: MetaMaskConnect,
  })),
)
const MetaMaskFailure = lazy(() =>
  import('./MetaMask/components/Failure').then(({ MetaMaskFailure }) => ({
    default: MetaMaskFailure,
  })),
)

const PhantomConnect = lazy(() =>
  import('./Phantom/components/Connect').then(({ PhantomConnect }) => ({
    default: PhantomConnect,
  })),
)
const PhantomFailure = lazy(() =>
  import('./Phantom/components/Failure').then(({ PhantomFailure }) => ({
    default: PhantomFailure,
  })),
)

const MetaMaskMenu = lazy(() =>
  import('./MetaMask/components/MetaMaskMenu').then(({ MetaMaskMenu }) => ({
    default: MetaMaskMenu,
  })),
)
const LedgerMenu = lazy(() =>
  import('./Ledger/components/LedgerMenu').then(({ LedgerMenu }) => ({
    default: LedgerMenu,
  })),
)

const MobileCreate = lazy(() =>
  import('./MobileWallet/components/MobileCreate').then(({ MobileCreate }) => ({
    default: MobileCreate,
  })),
)
const MobileCreateTest = lazy(() =>
  import('./MobileWallet/components/MobileCreateTest').then(({ MobileCreateTest }) => ({
    default: MobileCreateTest,
  })),
)
const MobileImport = lazy(() =>
  import('./MobileWallet/components/MobileImport').then(({ MobileImport }) => ({
    default: MobileImport,
  })),
)
const MobileLegacyCreate = lazy(() =>
  import('./MobileWallet/components/MobileLegacyCreate').then(({ MobileLegacyCreate }) => ({
    default: MobileLegacyCreate,
  })),
)
const MobileLegacyLogin = lazy(() =>
  import('./MobileWallet/components/MobileLegacyLogin').then(({ MobileLegacyLogin }) => ({
    default: MobileLegacyLogin,
  })),
)
const MobileLegacySuccess = lazy(() =>
  import('./MobileWallet/components/MobileLegacySuccess').then(({ MobileLegacySuccess }) => ({
    default: MobileLegacySuccess,
  })),
)
const MobileLoad = lazy(() =>
  import('./MobileWallet/components/MobileLoad').then(({ MobileLoad }) => ({
    default: MobileLoad,
  })),
)
const MobileRename = lazy(() =>
  import('./MobileWallet/components/MobileRename').then(({ MobileRename }) => ({
    default: MobileRename,
  })),
)
const MobileStart = lazy(() =>
  import('./MobileWallet/components/MobileStart').then(({ MobileStart }) => ({
    default: MobileStart,
  })),
)
const MobileSuccess = lazy(() =>
  import('./MobileWallet/components/MobileSuccess').then(({ MobileSuccess }) => ({
    default: MobileSuccess,
  })),
)

export type SupportedWalletInfo<T> = {
  adapters: {
    loadAdapter: () => Promise<T>
  }[]
  supportsMobile?: 'browser' | 'app' | 'both'
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  description?: string
  routes: RouteProps[]
  connectedWalletMenuRoutes?: RouteProps[]
  connectedWalletMenuInitialPath?: WalletConnectedRoutes
  connectedMenuComponent?: React.ComponentType<any>
}

export type SupportedWalletInfoByKeyManager = {
  // Native, Mobile, and Demo wallets are all native wallets
  [KeyManager.Native]: SupportedWalletInfo<typeof NativeAdapter>
  [KeyManager.Mobile]: SupportedWalletInfo<typeof NativeAdapter>
  [KeyManager.Demo]: SupportedWalletInfo<typeof NativeAdapter>
  // TODO(gomes): export WebUSBKeepKeyAdapter as a type in hdwallet, not a declare const
  // this effectively means we keep on importing the akschual package for now
  [KeyManager.KeepKey]: SupportedWalletInfo<typeof WebUSBKeepKeyAdapter | typeof KkRestAdapter>
  [KeyManager.Keplr]: SupportedWalletInfo<typeof KeplrAdapter>
  [KeyManager.Ledger]: SupportedWalletInfo<typeof LedgerAdapter>
  [KeyManager.Phantom]: SupportedWalletInfo<typeof PhantomAdapter>
  [KeyManager.MetaMask]: SupportedWalletInfo<typeof MetaMaskAdapter | typeof MetaMaskAdapter>
  [KeyManager.WalletConnectV2]: SupportedWalletInfo<typeof WalletConnectV2Adapter>
}

export const SUPPORTED_WALLETS: SupportedWalletInfoByKeyManager = {
  [KeyManager.Mobile]: {
    ...MobileConfig,
    routes: [
      { path: '/mobile/connect', component: MobileStart },
      { path: '/mobile/load', component: MobileLoad },
      { path: '/mobile/rename', component: MobileRename },
      { path: '/mobile/import', component: MobileImport },
      { path: '/mobile/create', component: MobileCreate },
      { path: '/mobile/create-test', component: MobileCreateTest },
      { path: '/mobile/success', component: MobileSuccess },
      { path: '/mobile/legacy/login', component: MobileLegacyLogin },
      { path: '/mobile/legacy/login/success', component: MobileLegacySuccess },
      // WalletProvider.create looks for the first path that ends in "create"
      { path: '/mobile/legacy/create', component: MobileLegacyCreate },
    ],
    connectedMenuComponent: NativeMenu,
  },
  [KeyManager.Native]: {
    ...NativeConfig,
    routes: [
      { path: NativeWalletRoutes.Connect, component: NativeStart },
      { path: NativeWalletRoutes.Load, component: NativeLoad },
      { path: NativeWalletRoutes.Password, component: NativePassword },
      { path: NativeWalletRoutes.Rename, component: NativeRename },
      { path: NativeWalletRoutes.Import, component: NativeImport },
      { path: NativeWalletRoutes.Create, component: NativeCreate },
      { path: NativeWalletRoutes.CreateTest, component: NativeTestPhrase },
      { path: NativeWalletRoutes.Success, component: NativeSuccess },
      { path: NativeWalletRoutes.EnterPassword, component: EnterPassword },
      { path: NativeWalletRoutes.LegacyLogin, component: NativeLegacyLogin },
      { path: NativeWalletRoutes.LegacyLoginSuccess, component: NativeLegacySuccess },
    ],
    connectedMenuComponent: NativeMenu,
  },
  [KeyManager.KeepKey]: {
    ...KeepKeyConfig,
    routes: [
      { path: KeepKeyRoutes.Connect, component: KeepKeyConnect },
      { path: KeepKeyRoutes.Success, component: KeepKeySuccess },
      { path: KeepKeyRoutes.Pin, component: KeepKeyPinModal },
      { path: KeepKeyRoutes.Passphrase, component: KeepKeyPassphrase },
      { path: KeepKeyRoutes.FactoryState, component: KeepKeyFactoryState },
      { path: KeepKeyRoutes.NewLabel, component: KeepKeyLabel },
      { path: KeepKeyRoutes.NewRecoverySentence, component: KeepKeyRecoverySentence },
      { path: KeepKeyRoutes.RecoverySentenceEntry, component: KeepKeyRecoverySentenceEntry },
      { path: KeepKeyRoutes.RecoverySettings, component: KeepKeyRecoverySettings },
      { path: KeepKeyRoutes.RecoverySettingUp, component: RecoverySettingUp },
      { path: KeepKeyRoutes.RecoverySentenceInvalid, component: KeepKeyRecoverySentenceInvalid },
      { path: KeepKeyRoutes.DownloadUpdater, component: KeepKeyDownloadUpdaterApp },
      { path: KeepKeyRoutes.Disconnect, component: KeepKeyDisconnect },
    ],
    connectedWalletMenuRoutes: [
      { path: WalletConnectedRoutes.KeepKey, component: KeepKeyMenu },
      { path: WalletConnectedRoutes.KeepKeyLabel, component: ChangeLabel },
      { path: WalletConnectedRoutes.KeepKeyPin, component: ChangePin },
      { path: WalletConnectedRoutes.KeepKeyTimeout, component: ChangeTimeout },
      { path: WalletConnectedRoutes.KeepKeyPassphrase, component: ChangePassphrase },
    ],
    connectedWalletMenuInitialPath: WalletConnectedRoutes.KeepKey,
    connectedMenuComponent: KeepKeyConnectedMenuItems,
  },
  [KeyManager.MetaMask]: {
    ...MetaMaskConfig,
    routes: [
      { path: '/metamask/connect', component: MetaMaskConnect },
      { path: '/metamask/snap/install', component: SnapInstall },
      { path: '/metamask/snap/update', component: SnapUpdate },
      { path: '/metamask/failure', component: MetaMaskFailure },
    ],
    connectedMenuComponent: MetaMaskMenu,
  },
  [KeyManager.Phantom]: {
    ...PhantomConfig,
    routes: [
      { path: '/phantom/connect', component: PhantomConnect },
      { path: '/phantom/failure', component: PhantomFailure },
    ],
  },

  [KeyManager.Demo]: {
    ...DemoConfig,
    routes: [],
    connectedMenuComponent: DemoMenu,
  },
  [KeyManager.Keplr]: {
    ...KeplrConfig,
    routes: [
      { path: '/keplr/connect', component: KeplrConnect },
      { path: '/keplr/failure', component: KeplrFailure },
    ],
  },
  [KeyManager.Ledger]: {
    ...LedgerConfig,
    routes: [
      { path: '/ledger/connect', component: LedgerConnect },
      { path: '/ledger/chains', component: LedgerChains },
      { path: '/ledger/success', component: LedgerSuccess },
      { path: '/ledger/failure', component: LedgerFailure },
    ],
    connectedMenuComponent: LedgerMenu,
  },
  [KeyManager.WalletConnectV2]: {
    ...WalletConnectV2Config,
    routes: [{ path: '/walletconnectv2/connect', component: WalletConnectV2Connect }],
  },
}

type KeyManagerOptions = undefined | EthereumProviderOptions
type GetKeyManagerOptions = (keyManager: KeyManager, isDarkMode: boolean) => KeyManagerOptions

export const getKeyManagerOptions: GetKeyManagerOptions = keyManager => {
  switch (keyManager) {
    case KeyManager.WalletConnectV2:
      return walletConnectV2ProviderConfig
    default:
      return undefined
  }
}
