import type React from 'react'
import { RouteComponentProps } from 'react-router-dom'
import type { Vault } from 'vault/'

import type { ActionTypes } from '../WalletProvider'

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
