import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import type React from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import type { ActionTypes } from 'context/WalletProvider/actions'

export type NativeWalletValues = {
  name: string
  password: string
  email: string
  twoFactorCode: string
  mnemonic: string
  message: string
  confirmPassword: string
}

export interface LocationState {
  vault: Vault
  isLegacyWallet?: boolean
  error?: {
    message: string
  }
}

export interface NativeSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  vault: Vault
  dispatch: React.Dispatch<ActionTypes>
}
