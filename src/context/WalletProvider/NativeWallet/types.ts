import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import type { RouteComponentProps } from 'react-router-dom'

export type NativeWalletValues = {
  name: string
  password: string
  email: string
  twoFactorCode: string
  keystorePassword: string
  mnemonic: string
  message: string
  confirmPassword: string
}

export interface LocationState {
  vault: Vault
  error?: {
    message: string
  }
}

export type NativeSetupProps = RouteComponentProps<{}, any, LocationState>
