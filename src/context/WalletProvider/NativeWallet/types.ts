import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import React from 'react'

import { ActionTypes } from '../WalletProvider'

export interface LocationState {
  vault: Vault
  error?: {
    message: string
  }
}

export interface NativeSetupProps{
  vault: Vault
  dispatch: React.Dispatch<ActionTypes>
}
