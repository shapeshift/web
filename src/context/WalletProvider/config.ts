import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { CoinbaseAdapter } from '@shapeshiftoss/hdwallet-coinbase'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import type { KeplrAdapter } from '@shapeshiftoss/hdwallet-keplr'
import type { WebUSBLedgerAdapter as LedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import type { MetaMaskAdapter as MetaMaskMultiChainAdapter } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import type { XDEFIAdapter } from '@shapeshiftoss/hdwallet-xdefi'
import { getConfig } from 'config'
import type { RouteProps } from 'react-router-dom'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { ChangeLabel } from 'components/Layout/Header/NavBar/KeepKey/ChangeLabel'
import { ChangePassphrase } from 'components/Layout/Header/NavBar/KeepKey/ChangePassphrase'
import { ChangePin } from 'components/Layout/Header/NavBar/KeepKey/ChangePin'
import { ChangeTimeout } from 'components/Layout/Header/NavBar/KeepKey/ChangeTimeout'
import { KeepKeyMenu } from 'components/Layout/Header/NavBar/KeepKey/KeepKeyMenu'
import { NativeMenu } from 'components/Layout/Header/NavBar/Native/NativeMenu'
import { WalletConnectV2Connect } from 'context/WalletProvider/WalletConnectV2/components/Connect'
import { walletConnectV2ProviderConfig } from 'context/WalletProvider/WalletConnectV2/config'

import { CoinbaseConnect } from './Coinbase/components/Connect'
import { CoinbaseFailure } from './Coinbase/components/Failure'
import { CoinbaseConfig } from './Coinbase/config'
import { DemoConfig } from './DemoWallet/config'
import { KeepKeyConnect } from './KeepKey/components/Connect'
import { KeepKeyDisconnect } from './KeepKey/components/Disconnect'
import { KeepKeyDownloadUpdaterApp } from './KeepKey/components/DownloadUpdaterApp'
import { KeepKeyFactoryState } from './KeepKey/components/FactoryState'
import { KeepKeyLabel } from './KeepKey/components/Label'
import { KeepKeyPassphrase } from './KeepKey/components/Passphrase'
import { KeepKeyPinModal } from './KeepKey/components/PinModal'
import { KeepKeyRecoverySentence } from './KeepKey/components/RecoverySentence'
import { KeepKeyRecoverySentenceEntry } from './KeepKey/components/RecoverySentenceEntry'
import { KeepKeyRecoverySentenceInvalid } from './KeepKey/components/RecoverySentenceInvalid'
import { KeepKeyRecoverySettings } from './KeepKey/components/RecoverySettings'
import { RecoverySettingUp } from './KeepKey/components/RecoverySettingUp'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { KeepKeyConfig } from './KeepKey/config'
import { KeplrConnect } from './Keplr/components/Connect'
import { KeplrFailure } from './Keplr/components/Failure'
import { KeplrConfig } from './Keplr/config'
import { KeyManager } from './KeyManager'
import { LedgerChains } from './Ledger/components/Chains'
import { LedgerConnect } from './Ledger/components/Connect'
import { LedgerFailure } from './Ledger/components/Failure'
import { LedgerSuccess } from './Ledger/components/Success'
import { LedgerConfig } from './Ledger/config'
import { MetaMaskConnect } from './MetaMask/components/Connect'
import { MetaMaskFailure } from './MetaMask/components/Failure'
import { MetaMaskMenu } from './MetaMask/components/MetaMaskMenu'
import { SnapInstall } from './MetaMask/components/SnapInstall'
import { MetaMaskConfig } from './MetaMask/config'
import { MobileCreate } from './MobileWallet/components/MobileCreate'
import { MobileCreateTest } from './MobileWallet/components/MobileCreateTest'
import { MobileImport } from './MobileWallet/components/MobileImport'
import { MobileLegacyCreate } from './MobileWallet/components/MobileLegacyCreate'
import { MobileLegacyLogin } from './MobileWallet/components/MobileLegacyLogin'
import { MobileLegacySuccess } from './MobileWallet/components/MobileLegacySuccess'
import { MobileLoad } from './MobileWallet/components/MobileLoad'
import { MobileRename } from './MobileWallet/components/MobileRename'
import { MobileStart } from './MobileWallet/components/MobileStart'
import { MobileSuccess } from './MobileWallet/components/MobileSuccess'
import { MobileConfig } from './MobileWallet/config'
import { EnterPassword } from './NativeWallet/components/EnterPassword'
import { NativeCreate } from './NativeWallet/components/NativeCreate'
import { NativeImport } from './NativeWallet/components/NativeImport'
import { NativeLegacyLogin } from './NativeWallet/components/NativeLegacyLogin'
import { NativeLegacySuccess } from './NativeWallet/components/NativeLegacySuccess'
import { NativeLoad } from './NativeWallet/components/NativeLoad'
import { NativePassword } from './NativeWallet/components/NativePassword'
import { NativeRename } from './NativeWallet/components/NativeRename'
import { NativeStart } from './NativeWallet/components/NativeStart'
import { NativeSuccess } from './NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from './NativeWallet/components/NativeTestPhrase'
import { NativeConfig } from './NativeWallet/config'
import { KeepKeyRoutes } from './routes'
import { WalletConnectV2Create } from './WalletConnectV2/components/Create'
import { WalletConnectV2Load } from './WalletConnectV2/components/Load'
import { WalletConnectV2Config } from './WalletConnectV2/config'
import type { EthereumProviderOptions } from './WalletConnectV2/constants'
import { XDEFIConnect } from './XDEFI/components/Connect'
import { XDEFIFailure } from './XDEFI/components/Failure'
import { XDEFIConfig } from './XDEFI/config'

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
  [KeyManager.Coinbase]: SupportedWalletInfo<typeof CoinbaseAdapter>
  // Native, Mobile, and Demo wallets are all native wallets
  [KeyManager.Native]: SupportedWalletInfo<typeof NativeAdapter>
  [KeyManager.Mobile]: SupportedWalletInfo<typeof NativeAdapter>
  [KeyManager.Demo]: SupportedWalletInfo<typeof NativeAdapter>
  // TODO(gomes): export WebUSBKeepKeyAdapter as a type in hdwallet, not a declare const
  // this effectively means we keep on importing the akschual package for now
  [KeyManager.KeepKey]: SupportedWalletInfo<typeof WebUSBKeepKeyAdapter | typeof KkRestAdapter>
  [KeyManager.Keplr]: SupportedWalletInfo<typeof KeplrAdapter>
  [KeyManager.Ledger]: SupportedWalletInfo<typeof LedgerAdapter>
  [KeyManager.MetaMask]: SupportedWalletInfo<
    typeof MetaMaskAdapter | typeof MetaMaskMultiChainAdapter
  >
  [KeyManager.WalletConnectV2]: SupportedWalletInfo<typeof WalletConnectV2Adapter>
  [KeyManager.XDefi]: SupportedWalletInfo<typeof XDEFIAdapter>
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
      { path: '/native/connect', component: NativeStart },
      { path: '/native/load', component: NativeLoad },
      { path: '/native/password', component: NativePassword },
      { path: '/native/rename', component: NativeRename },
      { path: '/native/import', component: NativeImport },
      { path: '/native/create', component: NativeCreate },
      { path: '/native/create-test', component: NativeTestPhrase },
      { path: '/native/success', component: NativeSuccess },
      { path: '/native/enter-password', component: EnterPassword },
      { path: '/native/legacy/login', component: NativeLegacyLogin },
      { path: '/native/legacy/login/success', component: NativeLegacySuccess },
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
  },
  [KeyManager.MetaMask]: {
    ...MetaMaskConfig,
    routes: [
      { path: '/metamask/connect', component: MetaMaskConnect },
      { path: '/metamask/snap/install', component: SnapInstall },
      { path: '/metamask/failure', component: MetaMaskFailure },
    ],
    connectedMenuComponent: MetaMaskMenu,
  },
  [KeyManager.XDefi]: {
    ...XDEFIConfig,
    routes: [
      { path: '/xdefi/connect', component: XDEFIConnect },
      { path: '/xdefi/failure', component: XDEFIFailure },
    ],
  },
  [KeyManager.Coinbase]: {
    ...CoinbaseConfig,
    routes: [
      { path: '/coinbase/connect', component: CoinbaseConnect },
      { path: '/coinbase/failure', component: CoinbaseFailure },
    ],
  },
  [KeyManager.Demo]: {
    ...DemoConfig,
    routes: [],
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
  },
  [KeyManager.WalletConnectV2]: {
    ...WalletConnectV2Config,
    routes: [
      { path: '/walletconnectv2/connect', component: WalletConnectV2Connect },
      { path: '/walletconnectv2/load', component: WalletConnectV2Load },
      { path: '/walletconnectv2/create', component: WalletConnectV2Create },
    ],
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

type KeyManagerOptions = undefined | CoinbaseProviderConfig | EthereumProviderOptions
type GetKeyManagerOptions = (keyManager: KeyManager, isDarkMode: boolean) => KeyManagerOptions

export const getKeyManagerOptions: GetKeyManagerOptions = (keyManager, isDarkMode) => {
  switch (keyManager) {
    case KeyManager.WalletConnectV2:
      return walletConnectV2ProviderConfig
    case KeyManager.Coinbase:
      return {
        appName: 'ShapeShift',
        appLogoUrl: 'https://avatars.githubusercontent.com/u/52928763?s=50&v=4',
        defaultJsonRpcUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
        defaultChainId: 1,
        darkMode: isDarkMode,
      }
    default:
      return undefined
  }
}
