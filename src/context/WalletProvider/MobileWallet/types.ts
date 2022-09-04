import React from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'

import type { NativeWalletValues } from '../NativeWallet/types'
import type { RevocableWallet } from './RevocableWallet'

export type { NativeWalletValues }

export type RevocableObject<T> = T & {
  readonly revoke: () => void
  readonly addRevoker: (revoker: () => void) => void
}

export interface MobileLocationState {
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
