import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { CoinbaseAdapter } from '@shapeshiftoss/hdwallet-coinbase'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import type { KeplrAdapter } from '@shapeshiftoss/hdwallet-keplr'
import type { WebUSBLedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import type { XDEFIAdapter } from '@shapeshiftoss/hdwallet-xdefi'

import type { KeyManager } from './KeyManager'

export type AdaptersByKeyManager = {
  [KeyManager.Mobile]: [NativeAdapter]
  [KeyManager.Native]: [NativeAdapter]
  [KeyManager.Demo]: [NativeAdapter]
  [KeyManager.KeepKey]: [KkRestAdapter | typeof WebUSBKeepKeyAdapter]
  [KeyManager.Ledger]: [WebUSBLedgerAdapter]
  [KeyManager.Keplr]: [KeplrAdapter]
  [KeyManager.WalletConnectV2]: [WalletConnectV2Adapter]
  [KeyManager.MetaMask]: [MetaMaskAdapter]
  [KeyManager.Coinbase]: [CoinbaseAdapter]
  [KeyManager.XDefi]: [XDEFIAdapter]
}

export type GetAdapter = <K extends keyof AdaptersByKeyManager>(
  keyManager: K,
  index?: number,
) => Promise<AdaptersByKeyManager[K][number] | null>
