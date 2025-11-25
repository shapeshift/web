import type { crypto } from '@shapeshiftoss/hdwallet-native'

import type { NativeWalletValues } from '../NativeWallet/types'
import type { RevocableWallet } from './RevocableWallet'

export type { NativeWalletValues }

export type RevocableObject<T> = T & crypto.Isolation.Engines.Default.Revocable

export interface MobileLocationState {
  // This is passed between setup screens and then revoked when done
  vault?: RevocableWallet
  error?: {
    message: string
  }
}

export type MobileWalletInfo = {
  id: string
  label: string
  createdAt: number
}

export type MobileWalletInfoWithMnemonic = MobileWalletInfo & { mnemonic: string }

export type DetectedWallet = {
  name: string
  schema: string
  isInstalled: boolean
}
