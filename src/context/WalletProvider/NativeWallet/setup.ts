import { EncryptedWallet } from '@shapeshiftoss/hdwallet-native/dist/crypto'
import { RouteComponentProps } from 'react-router-dom'

import { ActionTypes } from '../WalletProvider'

export interface NativeSetupProps
  extends RouteComponentProps<
    {},
    any, // history
    {
      encryptedWallet?: EncryptedWallet
      error?: {
        message: string
      }
    }
  > {
  dispatch: React.Dispatch<ActionTypes>
}
