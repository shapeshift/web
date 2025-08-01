import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { CoinbaseAdapter } from '@shapeshiftoss/hdwallet-coinbase'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import type { KeplrAdapter } from '@shapeshiftoss/hdwallet-keplr'
import type { WebUSBLedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import type { PhantomAdapter } from '@shapeshiftoss/hdwallet-phantom'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'

import type { KeyManager } from './KeyManager'

export type AdaptersByKeyManager = {
  [KeyManager.Mobile]: NativeAdapter
  [KeyManager.Native]: NativeAdapter
  [KeyManager.KeepKey]: KkRestAdapter | typeof WebUSBKeepKeyAdapter
  [KeyManager.Ledger]: WebUSBLedgerAdapter
  [KeyManager.Keplr]: KeplrAdapter
  [KeyManager.WalletConnectV2]: WalletConnectV2Adapter
  [KeyManager.MetaMask]: MetaMaskAdapter
  [KeyManager.Phantom]: PhantomAdapter
  [KeyManager.Coinbase]: CoinbaseAdapter
}

export enum NativeWalletRoutes {
  Connect = '/native/connect',
  Load = '/native/load',
  Password = '/native/password',
  Rename = '/native/rename',
  Delete = '/native/delete',
  ImportSelect = '/native/import-select',
  ImportSeed = '/native/import-seed',
  ImportKeystore = '/native/import-keystore',
  Create = '/native/create',
  CreateTest = '/native/create-test',
  Success = '/native/success',
  EnterPassword = '/native/enter-password',
  WordsError = '/native/words-error',
  SkipConfirm = '/native/skip-confirm',
}

export type GetAdapter = <K extends keyof AdaptersByKeyManager>(
  keyManager: K,
  index?: K extends KeyManager.KeepKey ? 0 | 1 : 0, // only used for keepkey
) => Promise<AdaptersByKeyManager[K] | null>
