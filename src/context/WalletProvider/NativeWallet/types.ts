import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import React from 'react'
import { RouteComponentProps } from 'react-router-dom'

import { ActionTypes } from '../WalletProvider'

export interface LocationState {
  vault?: Vault
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
  dispatch: React.Dispatch<ActionTypes>
}
