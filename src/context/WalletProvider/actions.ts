import { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'

import { PinMatrixRequestType } from './KeepKey/KeepKeyTypes'
import { KeyManager } from './KeyManager'
import type { Adapters } from './WalletProvider'

export enum WalletActions {
  SET_ADAPTERS = 'SET_ADAPTERS',
  SET_WALLET = 'SET_WALLET',
  SET_CONNECTOR_TYPE = 'SET_CONNECTOR_TYPE',
  SET_INITIAL_ROUTE = 'SET_INITIAL_ROUTE',
  SET_IS_CONNECTED = 'SET_IS_CONNECTED',
  SET_WALLET_MODAL = 'SET_WALLET_MODAL',
  RESET_STATE = 'RESET_STATE',
  SET_LOCAL_WALLET_LOADING = 'SET_LOCAL_WALLET_LOADING',
  NATIVE_PASSWORD_OPEN = 'NATIVE_PASSWORD_OPEN',
  OPEN_KEEPKEY_PIN = 'OPEN_KEEPKEY_PIN',
  OPEN_KEEPKEY_PASSPHRASE = 'OPEN_KEEPKEY_PASSPHRASE',
}

export type ActionTypes =
  | { type: WalletActions.SET_ADAPTERS; payload: Adapters }
  | {
      type: WalletActions.SET_WALLET
      payload: {
        wallet: HDWallet | null
        name: string
        icon: ComponentWithAs<'svg', IconProps>
        deviceId: string
        meta?: { label: string }
      }
    }
  | { type: WalletActions.SET_IS_CONNECTED; payload: boolean }
  | { type: WalletActions.SET_CONNECTOR_TYPE; payload: KeyManager }
  | { type: WalletActions.SET_INITIAL_ROUTE; payload: string }
  | { type: WalletActions.SET_WALLET_MODAL; payload: boolean }
  | { type: WalletActions.SET_LOCAL_WALLET_LOADING; payload: boolean }
  | {
      type: WalletActions.NATIVE_PASSWORD_OPEN
      payload: {
        modal: boolean
        deviceId: string
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_PIN
      payload: {
        deviceId: string
        pinRequestType?: PinMatrixRequestType
      }
    }
  | {
      type: WalletActions.OPEN_KEEPKEY_PASSPHRASE
      payload: {
        deviceId: string
      }
    }
  | { type: WalletActions.RESET_STATE }
