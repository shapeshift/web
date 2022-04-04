import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import React from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { ActionTypes } from 'context/WalletProvider/actions'

export interface LocationState {
  vault: Vault
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
