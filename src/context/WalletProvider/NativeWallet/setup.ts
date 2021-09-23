import { EncryptedWallet } from '@shapeshiftoss/hdwallet-native/dist/crypto'
import React from 'react'
import { RouteComponentProps } from 'react-router-dom'

import { ActionTypes } from '../WalletProvider'

export interface LocationState {
  encryptedWallet?: EncryptedWallet
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
