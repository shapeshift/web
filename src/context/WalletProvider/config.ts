import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { CoinbaseAdapter } from '@shapeshiftoss/hdwallet-coinbase'
import type { GridPlusAdapter } from '@shapeshiftoss/hdwallet-gridplus'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import type { KeplrAdapter } from '@shapeshiftoss/hdwallet-keplr'
import type { WebUSBLedgerAdapter as LedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import type { PhantomAdapter } from '@shapeshiftoss/hdwallet-phantom'
import type { SeekerHDWallet } from '@shapeshiftoss/hdwallet-seeker'
import type { TrezorAdapter } from '@shapeshiftoss/hdwallet-trezor-connect'
import type { VultisigAdapter } from '@shapeshiftoss/hdwallet-vultisig'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import { lazy } from 'react'
import type { RouteProps as _RouteProps } from 'react-router-dom'

import { CoinbaseConfig } from './Coinbase/config'
import { GridPlusConfig } from './GridPlus/config'
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
import { SeekerConfig } from './Seeker/config'
import { TrezorConfig } from './Trezor/config'
import { NativeWalletRoutes } from './types'
import { VultisigConfig } from './Vultisig/config'
import { WalletConnectV2Config } from './WalletConnectV2/config'
import type { EthereumProviderOptions } from './WalletConnectV2/constants'

import { WalletConnectedRoutes } from '@/components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { getConfig } from '@/config'
import { walletConnectV2ProviderConfig } from '@/context/WalletProvider/WalletConnectV2/config'

// Every consumer renders these without props
type RouteComponent = React.LazyExoticComponent<React.ComponentType<Record<string, never>>>

export type WalletProviderRouteProps = _RouteProps & {
  component: RouteComponent
}

// connect() resolves a path from here, which the new flow may render itself
type WalletConnectRouteProps = _RouteProps & {
  component?: RouteComponent
}

const WalletConnectV2Connect = lazy(() =>
  import('./WalletConnectV2/components/Connect').then(({ WalletConnectV2Connect }) => ({
    default: WalletConnectV2Connect,
  })),
)

const ChangeLabel = lazy(() =>
  import('@/components/Layout/Header/NavBar/KeepKey/ChangeLabel').then(({ ChangeLabel }) => ({
    default: ChangeLabel,
  })),
)
const ChangePassphrase = lazy(() =>
  import('@/components/Layout/Header/NavBar/KeepKey/ChangePassphrase').then(
    ({ ChangePassphrase }) => ({ default: ChangePassphrase }),
  ),
)
const ChangePin = lazy(() =>
  import('@/components/Layout/Header/NavBar/KeepKey/ChangePin').then(({ ChangePin }) => ({
    default: ChangePin,
  })),
)
const ChangeTimeout = lazy(() =>
  import('@/components/Layout/Header/NavBar/KeepKey/ChangeTimeout').then(({ ChangeTimeout }) => ({
    default: ChangeTimeout,
  })),
)
const KeepKeyMenu = lazy(() =>
  import('@/components/Layout/Header/NavBar/KeepKey/KeepKeyMenu').then(({ KeepKeyMenu }) => ({
    default: KeepKeyMenu,
  })),
)
const NativeMenu = lazy(() =>
  import('@/components/Layout/Header/NavBar/Native/NativeMenu').then(({ NativeMenu }) => ({
    default: NativeMenu,
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
const TrezorMenu = lazy(() =>
  import('./Trezor/components/TrezorMenu').then(({ TrezorMenu }) => ({
    default: TrezorMenu,
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
  routes: WalletConnectRouteProps[]
  connectedWalletMenuRoutes?: WalletProviderRouteProps[]
  connectedWalletMenuInitialPath?: WalletConnectedRoutes
  connectedMenuComponent?: React.ComponentType<any>
}

export type SupportedWalletInfoByKeyManager = {
  [KeyManager.Coinbase]: SupportedWalletInfo<typeof CoinbaseAdapter>
  // Native and Mobile wallets are both native wallets
  [KeyManager.Native]: SupportedWalletInfo<typeof NativeAdapter>
  [KeyManager.Mobile]: SupportedWalletInfo<typeof NativeAdapter>
  // TODO(gomes): export WebUSBKeepKeyAdapter as a type in hdwallet, not a declare const
  // this effectively means we keep on importing the akschual package for now
  [KeyManager.KeepKey]: SupportedWalletInfo<typeof WebUSBKeepKeyAdapter | typeof KkRestAdapter>
  [KeyManager.Keplr]: SupportedWalletInfo<typeof KeplrAdapter>
  [KeyManager.Ledger]: SupportedWalletInfo<typeof LedgerAdapter>
  [KeyManager.Phantom]: SupportedWalletInfo<typeof PhantomAdapter>
  [KeyManager.Seeker]: SupportedWalletInfo<typeof SeekerHDWallet>
  [KeyManager.Vultisig]: SupportedWalletInfo<typeof VultisigAdapter>
  [KeyManager.MetaMask]: SupportedWalletInfo<typeof MetaMaskAdapter | typeof MetaMaskAdapter>
  [KeyManager.Trezor]: SupportedWalletInfo<typeof TrezorAdapter>
  [KeyManager.WalletConnectV2]: SupportedWalletInfo<typeof WalletConnectV2Adapter>
  [KeyManager.GridPlus]: SupportedWalletInfo<typeof GridPlusAdapter>
}

export const SUPPORTED_WALLETS: SupportedWalletInfoByKeyManager = {
  [KeyManager.Mobile]: {
    ...MobileConfig,
    routes: [
      { path: '/mobile/connect' },
      { path: '/mobile/load' },
      { path: '/mobile/rename' },
      { path: '/mobile/import-select' },
      { path: '/mobile/create' },
      { path: '/mobile/create-test' },
      { path: '/mobile/success' },
    ],
    connectedMenuComponent: NativeMenu,
  },
  [KeyManager.Native]: {
    ...NativeConfig,
    routes: [
      { path: NativeWalletRoutes.Connect },
      { path: NativeWalletRoutes.Load },
      { path: NativeWalletRoutes.Password },
      { path: NativeWalletRoutes.Rename },
      { path: NativeWalletRoutes.ImportSelect },
      { path: NativeWalletRoutes.ImportSeed },
      { path: NativeWalletRoutes.ImportKeystore },
      { path: NativeWalletRoutes.Create },
      { path: NativeWalletRoutes.CreateTest },
      { path: NativeWalletRoutes.Success },
      { path: NativeWalletRoutes.EnterPassword },
      { path: NativeWalletRoutes.WordsError },
      { path: NativeWalletRoutes.SkipConfirm },
    ],
    connectedMenuComponent: NativeMenu,
  },
  [KeyManager.KeepKey]: {
    ...KeepKeyConfig,
    routes: [
      { path: KeepKeyRoutes.Connect },
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
      { path: '/metamask/connect' },
      { path: '/metamask/snap/install' },
      { path: '/metamask/snap/update' },
      { path: '/metamask/native-multichain' },
      { path: '/metamask/failure' },
    ],
    connectedMenuComponent: MetaMaskMenu,
  },
  [KeyManager.Phantom]: {
    ...PhantomConfig,
    routes: [{ path: '/phantom/connect' }, { path: '/phantom/failure' }],
  },
  [KeyManager.Seeker]: {
    ...SeekerConfig,
    routes: [{ path: '/seeker/connect' }, { path: '/seeker/failure' }],
  },
  [KeyManager.Vultisig]: {
    ...VultisigConfig,
    routes: [{ path: '/vultisig/connect' }, { path: '/vultisig/failure' }],
  },
  [KeyManager.Coinbase]: {
    ...CoinbaseConfig,
    routes: [{ path: '/coinbase/connect' }, { path: '/coinbase/failure' }],
  },
  [KeyManager.Keplr]: {
    ...KeplrConfig,
    routes: [{ path: '/keplr/connect' }, { path: '/keplr/failure' }],
  },
  [KeyManager.Ledger]: {
    ...LedgerConfig,
    routes: [
      { path: '/ledger/connect' },
      { path: '/ledger/chains' },
      { path: '/ledger/success' },
      { path: '/ledger/failure' },
    ],
    connectedMenuComponent: LedgerMenu,
  },
  [KeyManager.Trezor]: {
    ...TrezorConfig,
    routes: [],
    connectedMenuComponent: TrezorMenu,
  },
  [KeyManager.WalletConnectV2]: {
    ...WalletConnectV2Config,
    routes: [{ path: '/walletconnectv2/connect', component: WalletConnectV2Connect }],
  },
  [KeyManager.GridPlus]: {
    ...GridPlusConfig,
    routes: [
      { path: '/gridplus/connect' },
      { path: '/gridplus/pair' },
      { path: '/gridplus/setup' },
    ],
    connectedMenuComponent: lazy(() =>
      import('./GridPlus/components/GridPlusMenu').then(({ GridPlusMenu }) => ({
        default: GridPlusMenu,
      })),
    ),
  },
}

// Copied from hdwallet-coinbase so we don't have to import the whole package just for the sake of this type
// and can lazy load it instead
type CoinbaseProviderConfig = {
  appName: string
  appLogoUrl: string
  defaultJsonRpcUrl: string
  defaultChainId: number
  darkMode: boolean
}

type TrezorConnectArgs = {
  debug: boolean
  manifest: {
    appUrl: string
    email: string
    appName?: string
  }
}

type KeyManagerOptions =
  | undefined
  | CoinbaseProviderConfig
  | EthereumProviderOptions
  | TrezorConnectArgs
type GetKeyManagerOptions = (keyManager: KeyManager, isDarkMode: boolean) => KeyManagerOptions

export const getKeyManagerOptions: GetKeyManagerOptions = (keyManager, isDarkMode) => {
  switch (keyManager) {
    case KeyManager.Coinbase:
      return {
        appName: 'ShapeShift',
        appLogoUrl: 'https://avatars.githubusercontent.com/u/52928763?s=50&v=4',
        defaultJsonRpcUrl: getConfig().VITE_ETHEREUM_NODE_URL,
        defaultChainId: 1,
        darkMode: isDarkMode,
      }
    case KeyManager.Trezor:
      return {
        debug: false,
        manifest: {
          appUrl: 'https://app.shapeshift.com',
          email: 'marketing@shapeshift.org',
          appName: 'ShapeShift',
        },
      }
    case KeyManager.WalletConnectV2:
      return walletConnectV2ProviderConfig
    default:
      return undefined
  }
}
