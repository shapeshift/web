import type { crypto } from '@shapeshiftoss/hdwallet-native'
import type React from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'

import type { NativeWalletValues } from '../NativeWallet/types'
import type { RevocableWallet } from './RevocableWallet'

export type { NativeWalletValues }

export type RevocableObject<T> = T & crypto.Isolation.Engines.Default.Revocable

export interface MobileLocationState {
  // This is passed between setup screens and then revoked when done
  vault?: RevocableWallet
  isLegacyWallet?: boolean
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

export interface MobileSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    MobileLocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}
